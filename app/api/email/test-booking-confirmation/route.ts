import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Test endpoint for booking confirmation email
 * POST /api/email/test-booking-confirmation
 * 
 * Body (optional):
 * {
 *   "reservationId": "uuid" // If not provided, uses the most recent reservation
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { reservationId } = body;

    console.log('=== TEST: Booking confirmation email test endpoint called ===');
    console.log('Request body:', body);

    const supabase = createServiceClient();

    let reservation;

    if (reservationId) {
      // Use provided reservation ID
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          guest_profiles!guest_id(
            first_name,
            last_name,
            email
          ),
          rooms!room_id(
            name,
            room_type,
            base_price
          ),
          hotels!hotel_id(
            business_id
          )
        `)
        .eq('id', reservationId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'Reservation not found', details: error?.message },
          { status: 404 }
        );
      }
      reservation = data;
    } else {
      // Get the most recent reservation
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          guest_profiles!guest_id(
            first_name,
            last_name,
            email
          ),
          rooms!room_id(
            name,
            room_type,
            base_price
          ),
          hotels!hotel_id(
            business_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'No reservations found', details: error?.message },
          { status: 404 }
        );
      }
      reservation = data;
    }

    console.log('=== TEST: Found reservation ===', reservation.id);

    // Now call the actual booking confirmation endpoint logic
    // We'll forward to the actual endpoint
    const bookingConfirmationUrl = new URL('/api/email/booking-confirmation', request.url);
    
    const response = await fetch(bookingConfirmationUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reservationId: reservation.id,
      }),
    });

    const result = await response.json();

    console.log('=== TEST: Email API response ===', {
      status: response.status,
      result,
    });

    return NextResponse.json({
      success: response.ok,
      reservationId: reservation.id,
      emailApiResponse: result,
      message: response.ok 
        ? 'Email API called successfully. Check logs above for details.'
        : 'Email API returned an error. Check logs above for details.',
    });
  } catch (error: any) {
    console.error('=== TEST: Error in test endpoint ===', error);
    return NextResponse.json(
      {
        error: 'Test endpoint error',
        details: error.message || 'Unknown error',
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to list recent reservations for testing
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select(`
        id,
        confirmation_number,
        check_in_date,
        check_out_date,
        reservation_status,
        created_at,
        guest_profiles!guest_id(
          first_name,
          last_name,
          email
        ),
        hotels!hotel_id(
          business_id
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch reservations', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Use POST to test email sending. Recent reservations:',
      reservations: reservations || [],
      instructions: 'POST to this endpoint with {"reservationId": "uuid"} or empty body to use most recent reservation',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error fetching reservations', details: error.message },
      { status: 500 }
    );
  }
}




