import { createClient } from '@/lib/supabase/server';
import { pushBooking as pushToOctorate } from '@/lib/services/octorate/bookings';

/**
 * Generic channel manager push service
 * Routes bookings to the appropriate channel manager based on hotel configuration
 */
export interface PushBookingResult {
  success: boolean;
  channelManager?: string;
  bookingId?: string;
  error?: string;
}

/**
 * Push a booking to the appropriate channel manager
 * @param hotelId - Hotel ID
 * @param reservationId - Reservation ID
 * @returns Push result with success status and any relevant data
 */
export async function pushBookingToChannelManager(
  hotelId: string,
  reservationId: string
): Promise<PushBookingResult> {
  const supabase = await createClient();

  try {
    // Get hotel configuration to determine which channel manager to use
    const { data: hotel, error: hotelError } = await supabase
      .from('hotels')
      .select('pms_type, octorate_connection_id')
      .eq('id', hotelId)
      .single();

    if (hotelError) {
      throw new Error(`Failed to fetch hotel: ${hotelError.message}`);
    }

    if (!hotel) {
      throw new Error('Hotel not found');
    }

    // If hotel uses internal PMS, no push needed
    if (!hotel.pms_type || hotel.pms_type === 'internal') {
      return {
        success: true,
        channelManager: 'internal',
      };
    }

    // Route to appropriate channel manager based on pms_type
    switch (hotel.pms_type) {
      case 'octorate':
        return await pushToOctorateChannelManager(hotelId, reservationId, hotel.octorate_connection_id);

      // Future channel managers can be added here:
      // case 'mews':
      //   return await pushToMewsChannelManager(hotelId, reservationId, hotel.mews_connection_id);
      // case 'cloudbeds':
      //   return await pushToCloudbedsChannelManager(hotelId, reservationId, hotel.cloudbeds_connection_id);

      default:
        console.warn(`Unknown channel manager type: ${hotel.pms_type}`);
        return {
          success: false,
          error: `Unknown channel manager type: ${hotel.pms_type}`,
        };
    }
  } catch (error: any) {
    console.error('Error pushing booking to channel manager:', error);
    return {
      success: false,
      error: error.message || 'Failed to push booking to channel manager',
    };
  }
}

/**
 * Push booking to Octorate channel manager
 */
async function pushToOctorateChannelManager(
  hotelId: string,
  reservationId: string,
  connectionId: string | null
): Promise<PushBookingResult> {
  if (!connectionId) {
    return {
      success: false,
      channelManager: 'octorate',
      error: 'Octorate connection not found',
    };
  }

  try {
    const supabase = await createClient();

    // Check if reservation already pushed to Octorate to avoid duplicates
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select('octorate_push_status')
      .eq('id', reservationId)
      .single();

    if (reservationError) {
      throw new Error(`Failed to fetch reservation: ${reservationError.message}`);
    }

    // Skip if already pushed or confirmed (prevent duplicate pushes)
    if (reservation?.octorate_push_status === 'pushed' || reservation?.octorate_push_status === 'confirmed') {
      return {
        success: true,
        channelManager: 'octorate',
        error: 'Booking already pushed to Octorate',
      };
    }

    // Get connection details to retrieve accommodation ID
    const { data: connection, error: connectionError } = await supabase
      .from('octorate_hotel_connections')
      .select('octorate_accommodation_id, is_active, is_connected')
      .eq('id', connectionId)
      .single();

    if (connectionError || !connection) {
      return {
        success: false,
        channelManager: 'octorate',
        error: 'Octorate connection not found or invalid',
      };
    }

    if (!connection.is_active || !connection.is_connected) {
      return {
        success: false,
        channelManager: 'octorate',
        error: 'Octorate connection is not active or connected',
      };
    }

    // Push booking to Octorate
    const bookingResponse = await pushToOctorate(
      connectionId,
      hotelId,
      reservationId,
      connection.octorate_accommodation_id
    );

    return {
      success: true,
      channelManager: 'octorate',
      bookingId: bookingResponse.bookingId,
    };
  } catch (error: any) {
    console.error('Error pushing booking to Octorate:', error);
    return {
      success: false,
      channelManager: 'octorate',
      error: error.message || 'Failed to push booking to Octorate',
    };
  }
}

