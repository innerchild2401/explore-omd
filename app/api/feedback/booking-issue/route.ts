import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { verifyEmailToken } from '@/lib/services/email-sequence/tokens';
import logger from '@/lib/logger';
import { rateLimitCheck } from '@/lib/middleware/rate-limit';
import { validateRequest } from '@/lib/validation/validate';
import { bookingIssueSchema } from '@/lib/validation/schemas';

/**
 * Submit booking issue report
 * POST /api/feedback/booking-issue
 * Body: { reservationId, token, issueType, description, contactPreference }
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await rateLimitCheck(request, 'feedback');
  if (!rateLimit.success) {
    return rateLimit.response!;
  }
  try {
    // Validate request body
    const validation = await validateRequest(request, bookingIssueSchema);
    if (!validation.success) {
      return validation.response;
    }
    const { reservationId, token, issueType, description, contactPreference } = validation.data;

    // Use service role client to bypass RLS for public form submissions
    const supabase = createServiceRoleClient();

    // Get reservation with guest email and hotel ID
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select(`
        id,
        hotel_id,
        guest_profiles!guest_id(email)
      `)
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    const guestEmail = (reservation.guest_profiles as any)?.email;
    if (!guestEmail) {
      return NextResponse.json(
        { error: 'Guest email not found' },
        { status: 404 }
      );
    }

    // Verify token
    const isValid = verifyEmailToken(token, reservationId, guestEmail);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Create issue report
    const { error: insertError } = await supabase
      .from('booking_issue_reports')
      .insert({
        reservation_id: reservationId,
        hotel_id: reservation.hotel_id,
        issue_type: issueType,
        description: description.trim(),
        contact_preference: contactPreference || 'email',
        guest_email: guestEmail,
        status: 'open',
      });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Error submitting booking issue report', error, {});
    return NextResponse.json(
      { error: error.message || 'Failed to submit issue report' },
      { status: 500 }
    );
  }
}

