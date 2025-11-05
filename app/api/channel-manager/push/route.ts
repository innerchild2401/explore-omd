import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pushBookingToChannelManager } from '@/lib/services/channel-manager/push';

/**
 * API endpoint to push a booking to the appropriate channel manager
 * POST /api/channel-manager/push
 * Body: { reservationId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reservationId } = await request.json();

    if (!reservationId) {
      return NextResponse.json({ error: 'reservationId is required' }, { status: 400 });
    }

    // Get reservation to find hotel_id
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select('hotel_id, octorate_push_status')
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    // Push booking to appropriate channel manager
    const result = await pushBookingToChannelManager(reservation.hotel_id, reservationId);

    // Update reservation status based on result
    if (!result.success) {
      await supabase
        .from('reservations')
        .update({
          octorate_push_status: 'failed',
        })
        .eq('id', reservationId);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Channel manager push error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to push booking' },
      { status: 500 }
    );
  }
}

