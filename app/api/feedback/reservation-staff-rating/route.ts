import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyEmailToken } from '@/lib/services/email-sequence/tokens';

/**
 * Submit reservation staff rating
 * POST /api/feedback/reservation-staff-rating
 * Body: { reservationId, token, rating, comment? }
 */
export async function POST(request: NextRequest) {
  try {
    const { reservationId, token, rating, comment } = await request.json();

    if (!reservationId || !token || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

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

    // Check if rating already exists
    const { data: existingRating } = await supabase
      .from('reservation_staff_ratings')
      .select('id')
      .eq('reservation_id', reservationId)
      .maybeSingle();

    if (existingRating) {
      // Update existing rating
      const { error: updateError } = await supabase
        .from('reservation_staff_ratings')
        .update({
          rating,
          comment: comment || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRating.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      // Create new rating
      const { error: insertError } = await supabase
        .from('reservation_staff_ratings')
        .insert({
          reservation_id: reservationId,
          hotel_id: reservation.hotel_id,
          rating,
          comment: comment || null,
          guest_email: guestEmail,
        });

      if (insertError) {
        throw insertError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error submitting rating:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit rating' },
      { status: 500 }
    );
  }
}

