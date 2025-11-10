import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyEmailToken } from '@/lib/services/email-sequence/tokens';

export const dynamic = 'force-dynamic';

/**
 * Verify email token and return reservation data
 * GET /api/feedback/verify-token?reservationId=xxx&token=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reservationId = searchParams.get('reservationId');
    const token = searchParams.get('token');

    if (!reservationId || !token) {
      return NextResponse.json(
        { valid: false, error: 'Missing reservationId or token' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get reservation with guest email
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select(`
        id,
        confirmation_number,
        guest_profiles!guest_id(email),
        hotels!hotel_id(
          businesses!business_id(name)
        )
      `)
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservation) {
      return NextResponse.json(
        { valid: false, error: 'Reservation not found' },
        { status: 404 }
      );
    }

    const guestEmail = (reservation.guest_profiles as any)?.email;
    if (!guestEmail) {
      return NextResponse.json(
        { valid: false, error: 'Guest email not found' },
        { status: 404 }
      );
    }

    // Verify token
    const isValid = verifyEmailToken(token, reservationId, guestEmail);

    if (!isValid) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      reservation: {
        confirmation_number: reservation.confirmation_number,
        hotel_name: (reservation.hotels as any)?.businesses?.name || 'Hotel',
      },
    });
  } catch (error: any) {
    console.error('Error verifying token:', error);
    return NextResponse.json(
      { valid: false, error: error.message || 'Failed to verify token' },
      { status: 500 }
    );
  }
}

