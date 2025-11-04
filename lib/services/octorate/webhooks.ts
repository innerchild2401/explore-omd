import { createClient } from '@/lib/supabase/server';
import { OctorateWebhookEvent } from './types';
import { pullAvailability } from './availability';
import { pullRates } from './rates';

export async function processWebhook(
  connectionId: string,
  event: OctorateWebhookEvent
): Promise<void> {
  const supabase = await createClient();

  // Log webhook event
  await supabase
    .from('octorate_webhook_events')
    .insert({
      octorate_connection_id: connectionId,
      event_type: event.eventType,
      payload: event.payload,
      processed: false,
    });

  try {
    // Get connection details
    const { data: connection } = await supabase
      .from('octorate_hotel_connections')
      .select('hotel_id, octorate_accommodation_id')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      throw new Error('Connection not found');
    }

    // Process different event types
    switch (event.eventType) {
      case 'PORTAL_SUBSCRIPTION_CALENDAR':
        // Availability or rate update
        if (event.payload.availability) {
          // Pull updated availability
          const startDate = event.payload.start_date || new Date().toISOString().split('T')[0];
          const endDate = event.payload.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          await pullAvailability(
            connectionId,
            connection.hotel_id,
            connection.octorate_accommodation_id,
            startDate,
            endDate
          );
        }
        if (event.payload.rates) {
          // Pull updated rates
          const startDate = event.payload.start_date || new Date().toISOString().split('T')[0];
          const endDate = event.payload.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          await pullRates(
            connectionId,
            connection.hotel_id,
            connection.octorate_accommodation_id,
            startDate,
            endDate
          );
        }
        break;

      case 'booking_confirmation':
        // Booking confirmed by hotel
        if (event.payload.bookingId) {
          await supabase
            .from('reservations')
            .update({
              octorate_push_status: 'confirmed',
              octorate_confirmation_received_at: new Date().toISOString(),
              reservation_status: 'confirmed',
            })
            .eq('octorate_booking_id', event.payload.bookingId);
        }
        break;

      case 'booking_cancellation':
        // Booking cancelled in Octorate
        if (event.payload.bookingId) {
          await supabase
            .from('reservations')
            .update({
              reservation_status: 'cancelled',
            })
            .eq('octorate_booking_id', event.payload.bookingId);
        }
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.eventType}`);
    }

    // Mark webhook as processed
    await supabase
      .from('octorate_webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('octorate_connection_id', connectionId)
      .eq('event_type', event.eventType)
      .eq('created_at', new Date().toISOString().split('T')[0]);
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    
    // Mark webhook as failed
    await supabase
      .from('octorate_webhook_events')
      .update({
        error_message: error.message,
      })
      .eq('octorate_connection_id', connectionId)
      .eq('event_type', event.eventType)
      .eq('created_at', new Date().toISOString().split('T')[0]);
    
    throw error;
  }
}

