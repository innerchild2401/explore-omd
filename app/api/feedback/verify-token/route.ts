import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyEmailToken } from '@/lib/services/email-sequence/tokens';
import { log } from '@/lib/logger';
import { rateLimitCheck } from '@/lib/middleware/rate-limit';
import { validateQuery } from '@/lib/validation/validate';
import { verifyTokenQuerySchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

/**
 * Verify email token and return reservation data
 * GET /api/feedback/verify-token?reservationId=xxx&token=xxx
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = await rateLimitCheck(request, 'feedback');
  if (!rateLimit.success) {
    return rateLimit.response!;
  }
  try {
    // Validate query parameters
    const validation = validateQuery(request, verifyTokenQuerySchema);
    if (!validation.success) {
      return validation.response;
    }
    const { reservationId, token } = validation.data;

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
    const searchParams = request.nextUrl.searchParams;
    log.error('Error verifying email token', error, {
      reservationId: searchParams.get('reservationId'),
    });
    return NextResponse.json(
      { valid: false, error: error.message || 'Failed to verify token' },
      { status: 500 }
    );
  }
}

