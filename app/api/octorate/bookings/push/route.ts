import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pushBooking } from '@/lib/services/octorate/bookings';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reservationId } = await request.json();

    if (!reservationId) {
      return NextResponse.json({ error: 'reservation_id is required' }, { status: 400 });
    }

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
    console.error('Booking push error:', error);
    
    // Update reservation with failed status
    const { reservationId } = await request.json();
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

