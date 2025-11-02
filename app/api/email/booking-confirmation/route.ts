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
  console.log('========================================');
  console.log('📧 BOOKING CONFIRMATION EMAIL API CALLED');
  console.log('========================================');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  
  try {
    const body = await request.json();
    const { reservationId } = body;

    console.log('Booking confirmation email request received:', { reservationId });

    if (!reservationId) {
      console.error('Missing reservationId in request');
      return NextResponse.json(
        { error: 'Missing reservationId' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Fetch reservation first (hotel_id references hotels.id, not businesses.id)
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservation) {
      console.error('Error fetching reservation:', reservationError);
      console.error('ReservationError details:', JSON.stringify(reservationError, null, 2));
      return NextResponse.json(
        { error: 'Reservation not found', details: reservationError?.message },
        { status: 404 }
      );
    }

    console.log('Reservation fetched:', {
      id: reservation.id,
      hotel_id: reservation.hotel_id,
      guest_id: reservation.guest_id,
      room_id: reservation.room_id,
    });

    // Fetch guest profile
    const { data: guest, error: guestError } = await supabase
      .from('guest_profiles')
      .select('first_name, last_name, email')
      .eq('id', reservation.guest_id)
      .single();

    if (guestError || !guest) {
      console.error('Error fetching guest:', guestError);
      return NextResponse.json(
        { error: 'Guest profile not found', details: guestError?.message },
        { status: 404 }
      );
    }

    // Fetch room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('name, room_type, base_price')
      .eq('id', reservation.room_id)
      .single();

    if (roomError || !room) {
      console.error('Error fetching room:', roomError);
      return NextResponse.json(
        { error: 'Room not found', details: roomError?.message },
        { status: 404 }
      );
    }

    // Fetch hotel (hotel_id references hotels.id)
    const { data: hotel, error: hotelError } = await supabase
      .from('hotels')
      .select('business_id')
      .eq('id', reservation.hotel_id)
      .single();

    if (hotelError || !hotel) {
      console.error('Error fetching hotel:', hotelError);
      return NextResponse.json(
        { error: 'Hotel not found', details: hotelError?.message },
        { status: 404 }
      );
    }

    // Fetch business through hotel
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, omd_id, contact')
      .eq('id', hotel.business_id)
      .single();

    if (businessError || !businessData) {
      console.error('Error fetching business:', businessError);
      return NextResponse.json(
        { error: 'Business not found', details: businessError?.message },
        { status: 404 }
      );
    }

    console.log('All reservation data fetched successfully:', {
      hasGuest: !!guest,
      hasRoom: !!room,
      hasBusiness: !!businessData,
      guestEmail: guest?.email,
      businessId: businessData?.id,
      businessName: businessData?.name,
    });

    // All data fetched successfully, continue with email
    const finalBusiness = businessData;
    
    // Fetch OMD data
    const { data: omd, error: omdError } = await supabase
      .from('omds')
      .select('id, slug, name')
      .eq('id', finalBusiness.omd_id)
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
    
    // Calculate base rate correctly
    // For tentative bookings, base_rate might be 0 or only one night's price
    // If base_rate equals room_price, it's likely just one night's price, not the total
    // Always calculate total based on nights and room price for tentative bookings
    let baseRate = reservation.base_rate;
    
    // For tentative bookings or when base_rate is 0 or equals room price (one night), recalculate
    if (reservation.reservation_status === 'tentative' || 
        !baseRate || 
        baseRate <= 0 || 
        baseRate <= room.base_price) {
      // Recalculate as it's likely just one night's price stored
      baseRate = room.base_price * nights;
      console.log('Recalculating base_rate:', {
        reservation_status: reservation.reservation_status,
        original_base_rate: reservation.base_rate,
        room_price_per_night: room.base_price,
        nights: nights,
        calculated_total: baseRate,
      });
    }
    
    const taxes = reservation.taxes || 0;
    const fees = reservation.fees || 0;
    const totalDue = baseRate + taxes + fees;
    
    console.log('Pricing calculation:', {
      base_rate: baseRate,
      taxes: taxes,
      fees: fees,
      total_due: totalDue,
      nights: nights,
      room_price_per_night: room.base_price,
      currency: reservation.currency || 'EUR',
    });

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
    const businessEmail = (finalBusiness.contact as any)?.email;
    
    // For trial accounts, use verified email if business email not available
    const trialMode = process.env.MAILER_SEND_TRIAL_MODE === 'true';
    const trialEmail = process.env.MAILER_SEND_TRIAL_EMAIL || 'filip.alex24@gmail.com';
    
    console.log('Business contact info:', {
      contact: finalBusiness.contact,
      email: businessEmail,
      trialMode,
      trialEmail,
    });
    
    if (!businessEmail && !trialMode) {
      console.error('Business email not found in contact information:', finalBusiness.contact);
      return NextResponse.json(
        { error: 'Business email not found in contact information', details: { contact: finalBusiness.contact } },
        { status: 400 }
      );
    }
    
    const actualBusinessEmail = businessEmail || trialEmail;

    // Calculate number of guests
    const numberOfGuests = reservation.adults + (reservation.children || 0) + (reservation.infants || 0);

    // Prepare email variables (matching MailerSend template exactly - lowercase with underscores)
    // CRITICAL: All values must be strings for MailerSend template variables
    // Variable names must match EXACTLY what's in the template (case-sensitive, no spaces)
    const emailVariables: Record<string, string> = {
      name: String(guest.first_name || ''),
      destination_name: String(omd.slug || ''),
      business_name: String(finalBusiness.name || ''),
      total_due: `${totalDue.toFixed(2)} ${reservation.currency || 'EUR'}`,
      check_in_date: formatDate(reservation.check_in_date),
      check_out_date: formatDate(reservation.check_out_date),
      number_of_guests: String(numberOfGuests),
      room_type: String(room.name || room.room_type || 'Room'),
    };
    
    // Verify all variables are strings and non-empty where expected
    console.log('Variable type check:', Object.entries(emailVariables).map(([key, value]) => ({
      key,
      value,
      type: typeof value,
      isEmpty: value === '',
    })));

    console.log('Email variables prepared:', JSON.stringify(emailVariables, null, 2));
    console.log('Variables breakdown:', {
      'name (first_name)': guest.first_name,
      'Destination_name (OMD slug)': omd.slug,
      'Business_name': finalBusiness.name,
      'Total_due (calculated)': totalDue,
      'Check_in_date (formatted)': formatDate(reservation.check_in_date),
      'Check_out_date (formatted)': formatDate(reservation.check_out_date),
      'Number_of_guests': numberOfGuests,
      'Room_type': room.name || room.room_type,
    });

    // Send email using MailerSend REST API with template
    const mailerSendApiKey = process.env.MAILER_SEND_API_KEY;
    
    if (!mailerSendApiKey) {
      return NextResponse.json(
        { error: 'MAILER_SEND_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Prepare recipients
    // For trial accounts, redirect to verified email
    const originalRecipients = [
      {
        email: guest.email,
        name: `${guest.first_name} ${guest.last_name}`,
      },
      {
        email: actualBusinessEmail,
        name: finalBusiness.name,
      },
    ];
    
    // Check if we need to enable trial mode (if sending to unverified domains)
    // For trial accounts, MailerSend only allows sending to verified emails
    let recipients = originalRecipients;
    
    if (trialMode || !businessEmail) {
      console.log('Trial/Test mode: Redirecting emails to verified address:', trialEmail);
      console.log('Original recipients:', originalRecipients.map(r => `${r.name} <${r.email}>`));
      recipients = [
        {
          email: trialEmail,
          name: `Test Recipient (${originalRecipients.length} emails redirected)`,
        },
      ];
    }

    // Prepare personalization for each recipient
    // IMPORTANT: Email addresses in 'to' and 'personalization' must match EXACTLY (case-sensitive)
    // Normalize emails to ensure exact matching
    const normalizedRecipients = recipients.map(r => ({
      ...r,
      email: r.email.toLowerCase().trim(),
    }));
    
    const personalization = normalizedRecipients.map(recipient => ({
      email: recipient.email,
      data: emailVariables,
    }));

    // Prepare MailerSend request payload
    // MailerSend API requires subject even when using templates
    // For template_id, we ONLY use personalization array (not root-level variables)
    // The personalization.data contains the template variables
    const mailerSendPayload = {
      from: {
        email: 'no-reply@destexplore.eu',
        name: 'DestExplore',
      },
      to: normalizedRecipients.map(r => ({ 
        email: r.email, // Already normalized
        name: r.name 
      })),
      subject: `Booking Confirmation - ${finalBusiness.name}`, // Required even with templates
      template_id: 'pr9084zy03vgw63d',
      personalization: personalization,
    };
    
    console.log('DEBUG: Email matching verification:', {
      to_emails: mailerSendPayload.to.map(t => t.email),
      personalization_emails: personalization.map(p => p.email),
      all_match: mailerSendPayload.to.map(t => t.email).every((email, idx) => 
        email === personalization[idx]?.email
      ),
      variable_keys: Object.keys(emailVariables),
    });

    console.log('Sending email via MailerSend:', {
      template_id: mailerSendPayload.template_id,
      recipients: recipients.map(r => r.email),
      variables: emailVariables,
      payload: JSON.stringify(mailerSendPayload, null, 2),
    });

    // Send email via MailerSend REST API
    // Using v1 endpoint for email sending
    const mailerSendResponse = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mailerSendApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(mailerSendPayload),
    });

    // Handle different response types
    let mailerSendResult;
    const contentType = mailerSendResponse.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      mailerSendResult = await mailerSendResponse.json();
    } else {
      const textResult = await mailerSendResponse.text();
      console.log('MailerSend non-JSON response:', textResult);
      mailerSendResult = { message: textResult };
    }

    console.log('MailerSend response status:', mailerSendResponse.status);
    console.log('MailerSend response headers:', Object.fromEntries(mailerSendResponse.headers.entries()));
    console.log('MailerSend response body:', JSON.stringify(mailerSendResult, null, 2));

    if (!mailerSendResponse.ok) {
      console.error('MailerSend API error:', {
        status: mailerSendResponse.status,
        statusText: mailerSendResponse.statusText,
        body: mailerSendResult,
      });
      return NextResponse.json(
        {
          error: 'Failed to send email via MailerSend',
          details: mailerSendResult,
          status: mailerSendResponse.status,
        },
        { status: 500 }
      );
    }

    // Log email in database
    try {
      await supabase.from('email_logs').insert({
        recipient_email: recipients.map(r => r.email).join(', '),
        subject: `Booking Confirmation - ${finalBusiness.name}`,
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

