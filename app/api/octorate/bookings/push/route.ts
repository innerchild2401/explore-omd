import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pushBooking } from '@/lib/services/octorate/bookings';
import logger from '@/lib/logger';
import { rateLimitCheck } from '@/lib/middleware/rate-limit';
import { validateRequest } from '@/lib/validation/validate';
import { octorateBookingPushSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await rateLimitCheck(request, 'api');
  if (!rateLimit.success) {
    return rateLimit.response!;
  }
  let reservationId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const validation = await validateRequest(request, octorateBookingPushSchema);
    if (!validation.success) {
      return validation.response;
    }
    reservationId = validation.data.reservationId;

    // Get reservation
    const { data: reservation } = await supabase
      .from('reservations')
      .select('hotel_id')
      .eq('id', reservationId)
      .single();

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    // Get connection
    const { data: connection } = await supabase
      .from('octorate_hotel_connections')
      .select('*')
      .eq('hotel_id', reservation.hotel_id)
      .eq('is_active', true)
      .eq('is_connected', true)
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'Octorate connection not found' }, { status: 404 });
    }

    // Push booking to Octorate
    const bookingResponse = await pushBooking(
      connection.id,
      reservation.hotel_id,
      reservationId,
      connection.octorate_accommodation_id
    );

    return NextResponse.json({ success: true, booking: bookingResponse });
  } catch (error: any) {
    logger.error('Octorate booking push error', error, {
      reservationId,
    });
    
    // Update reservation with failed status
    if (reservationId) {
      const supabase = await createClient();
      await supabase
        .from('reservations')
        .update({
          octorate_push_status: 'failed',
        })
        .eq('id', reservationId);
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

