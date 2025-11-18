import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pushBookingToChannelManager } from '@/lib/services/channel-manager/push';
import { log } from '@/lib/logger';
import { rateLimitCheck } from '@/lib/middleware/rate-limit';
import { validateRequest } from '@/lib/validation/validate';
import { channelManagerPushSchema } from '@/lib/validation/schemas';

/**
 * API endpoint to push a booking to the appropriate channel manager
 * POST /api/channel-manager/push
 * Body: { reservationId: string }
 */
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
    const validation = await validateRequest(request, channelManagerPushSchema);
    if (!validation.success) {
      return validation.response;
    }
    reservationId = validation.data.reservationId;

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
    log.error('Channel manager push error', error, {
      reservationId,
    });
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to push booking' },
      { status: 500 }
    );
  }
}

