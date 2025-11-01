import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Send booking confirmation email using MailerSend template
 * POST /api/email/booking-confirmation
 * 
 * Body:
 * {
 *   "reservationId": "uuid"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reservationId } = body;

    if (!reservationId) {
      return NextResponse.json(
        { error: 'Missing reservationId' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Fetch reservation with related data
    const { data: reservation, error: reservationError } = await supabase
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

    if (reservationError || !reservation) {
      console.error('Error fetching reservation:', reservationError);
      return NextResponse.json(
        { error: 'Reservation not found', details: reservationError?.message },
        { status: 404 }
      );
    }

    // Extract data
    const guest = (reservation as any).guest_profiles;
    const room = (reservation as any).rooms;
    const hotel = (reservation as any).hotels;

    if (!guest || !room || !hotel) {
      return NextResponse.json(
        { error: 'Missing required reservation data' },
        { status: 400 }
      );
    }

    // Fetch business data
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, omd_id, contact')
      .eq('id', hotel.business_id)
      .single();

    if (businessError || !business) {
      console.error('Error fetching business:', businessError);
      return NextResponse.json(
        { error: 'Business not found', details: businessError?.message },
        { status: 404 }
      );
    }

    // Fetch OMD data
    const { data: omd, error: omdError } = await supabase
      .from('omds')
      .select('id, slug, name')
      .eq('id', business.omd_id)
      .single();

    if (omdError || !omd) {
      console.error('Error fetching OMD:', omdError);
      return NextResponse.json(
        { error: 'OMD not found', details: omdError?.message },
        { status: 404 }
      );
    }

    // Calculate total amount correctly
    const checkIn = new Date(reservation.check_in_date);
    const checkOut = new Date(reservation.check_out_date);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    // Get pricing from reservation (if available) or calculate from room base_price
    const baseRate = reservation.base_rate || (room.base_price * nights) || 0;
    const taxes = reservation.taxes || 0;
    const fees = reservation.fees || 0;
    const totalDue = baseRate + taxes + fees;

    // Format dates
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    // Get business email from contact JSONB
    const businessEmail = (business.contact as any)?.email;
    
    if (!businessEmail) {
      return NextResponse.json(
        { error: 'Business email not found in contact information' },
        { status: 400 }
      );
    }

    // Calculate number of guests
    const numberOfGuests = reservation.adults + (reservation.children || 0) + (reservation.infants || 0);

    // Prepare email variables
    const emailVariables = {
      name: guest.first_name,
      Destination_name: omd.slug,
      Business_name: business.name,
      Total_due: `${totalDue.toFixed(2)} ${reservation.currency || 'EUR'}`,
      Check_in_date: formatDate(reservation.check_in_date),
      Check_out_date: formatDate(reservation.check_out_date),
      Number_of_guests: numberOfGuests.toString(),
      Room_type: room.name || room.room_type || 'Room',
    };

    // Send email using MailerSend REST API with template
    const mailerSendApiKey = process.env.MAILER_SEND_API_KEY;
    
    if (!mailerSendApiKey) {
      return NextResponse.json(
        { error: 'MAILER_SEND_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Prepare recipients
    const recipients = [
      {
        email: guest.email,
        name: `${guest.first_name} ${guest.last_name}`,
      },
      {
        email: businessEmail,
        name: business.name,
      },
    ];

    // Prepare personalization for each recipient
    const personalization = recipients.map(recipient => ({
      email: recipient.email,
      data: emailVariables,
    }));

    // Send email via MailerSend REST API
    const mailerSendResponse = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mailerSendApiKey}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        from: {
          email: 'no-reply@destexplore.eu',
          name: 'DestExplore',
        },
        to: recipients,
        template_id: 'pr9084zy03vgw63d',
        personalization: personalization,
      }),
    });

    const mailerSendResult = await mailerSendResponse.json();

    if (!mailerSendResponse.ok) {
      console.error('MailerSend API error:', mailerSendResult);
      return NextResponse.json(
        {
          error: 'Failed to send email via MailerSend',
          details: mailerSendResult,
        },
        { status: 500 }
      );
    }

    // Log email in database
    try {
      await supabase.from('email_logs').insert({
        recipient_email: recipients.map(r => r.email).join(', '),
        subject: `Booking Confirmation - ${business.name}`,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log email:', logError);
      // Don't fail the request if logging fails
    }

    // Update reservation to mark confirmation sent
    try {
      await supabase
        .from('reservations')
        .update({ confirmation_sent: true })
        .eq('id', reservationId);
    } catch (updateError) {
      console.error('Failed to update reservation:', updateError);
      // Don't fail the request if update fails
    }

    return NextResponse.json({
      success: true,
      messageId: mailerSendResult.body?.message_id,
      sentTo: recipients.map(r => r.email),
      variables: emailVariables,
    });
  } catch (error: any) {
    console.error('Error sending booking confirmation email:', error);
    return NextResponse.json(
      {
        error: 'Failed to send booking confirmation email',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

