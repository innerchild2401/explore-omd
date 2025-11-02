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
      currency: reservation.currency || 'RON',
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

    // Prepare email variables
    const emailVariables = {
      name: guest.first_name || '',
      destination_name: omd.slug || '',
      business_name: finalBusiness.name || '',
      total_due: `${totalDue.toFixed(2)} ${reservation.currency || 'RON'}`,
      check_in_date: formatDate(reservation.check_in_date),
      check_out_date: formatDate(reservation.check_out_date),
      number_of_guests: String(numberOfGuests),
      room_type: room.name || room.room_type || 'Room',
    };

    // Create beautiful HTML email template
    const contactFormUrl = `https://www.destexplore.eu/${omd.slug}/contact`;
    
    const htmlEmail = `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmare Rezervare</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Confirmare Rezervare</h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Multumim pentru alegerea facuta!
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                <strong style="color: #667eea;">${emailVariables.name}</strong>, ne bucuram ca ai ales <strong>${emailVariables.destination_name}</strong> si <strong>${emailVariables.business_name}</strong> pentru a-ti petrece vacanta!
              </p>
              
              <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <h2 style="color: #333333; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">Detalii Rezervare</h2>
                
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0;">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                      <strong style="color: #667eea; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Total</strong>
                      <div style="color: #333333; font-size: 18px; font-weight: 600; margin-top: 5px;">${emailVariables.total_due}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                      <strong style="color: #667eea; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Check In</strong>
                      <div style="color: #333333; font-size: 16px; margin-top: 5px;">${emailVariables.check_in_date}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                      <strong style="color: #667eea; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Check Out</strong>
                      <div style="color: #333333; font-size: 16px; margin-top: 5px;">${emailVariables.check_out_date}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                      <strong style="color: #667eea; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Numar Oaspeti</strong>
                      <div style="color: #333333; font-size: 16px; margin-top: 5px;">${emailVariables.number_of_guests}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;">
                      <strong style="color: #667eea; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Tip Camera</strong>
                      <div style="color: #333333; font-size: 16px; margin-top: 5px;">${emailVariables.room_type}</div>
                    </td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 30px 0;">
                Cererea ta de rezervare a fost transmisa departamentului de rezervari al <strong>${emailVariables.business_name}</strong> si urmeaza sa fii contactat in cel mult 48 de ore de catre acestia pentru a stabili toate detaliile suplimentare.
              </p>
              
              <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 30px 0;">
                Disponibilitatea camerelor pe aceasta platforma este garantata de catre parteneri!
              </p>
              
              <!-- Problem Button -->
              <div style="margin: 40px 0; text-align: center;">
                <h3 style="color: #333333; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">Ai intampinat probleme?</h3>
                <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
                  Suntem aici sa mediem orice probleme aparute intre tine si partenerii prezenti pe platforma noastra. Apasa butonul de mai jos, completeaza formularul cu un scurt rezumat al interactiunii avute si un membru al echipei noastre va prelua problema ridicata de tine in cel mai scurt timp.
                </p>
                <a href="${contactFormUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                  Raporteaza Problema
                </a>
              </div>
              
              <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e0e0e0; text-align: center;">
                <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">
                  Echipa OMD <strong style="color: #667eea;">${emailVariables.destination_name}</strong> iti ureaza sejur de poveste!
                </p>
                <p style="color: #999999; font-size: 12px; margin: 20px 0 0 0;">
                  <a href="https://www.destexplore.eu" style="color: #667eea; text-decoration: none;">Terms</a> | 
                  <a href="https://www.destexplore.eu" style="color: #667eea; text-decoration: none;">Privacy</a> | 
                  <a href="https://www.destexplore.eu" style="color: #667eea; text-decoration: none;">Preferences</a> | 
                  <a href="https://www.destexplore.eu" style="color: #667eea; text-decoration: none;">Help center</a>
                </p>
                <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">
                  © 2026 Platforma gestionata prin destexplore.eu
                </p>
              </div>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
          <tr>
            <td style="text-align: center; padding: 20px; color: #999999; font-size: 12px;">
              Delivered by MailerSend
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // Plain text version for email clients that don't support HTML
    const textEmail = `
Multumim pentru alegerea facuta!

${emailVariables.name}, ne bucuram ca ai ales ${emailVariables.destination_name} si ${emailVariables.business_name} pentru a-ti petrece vacanta!

Detalii Rezervare:
- Total: ${emailVariables.total_due}
- Check In: ${emailVariables.check_in_date}
- Check Out: ${emailVariables.check_out_date}
- Numar Oaspeti: ${emailVariables.number_of_guests}
- Tip Camera: ${emailVariables.room_type}

Cererea ta de rezervare a fost transmisa departamentului de rezervari al ${emailVariables.business_name} si urmeaza sa fii contactat in cel mult 48 de ore de catre acestia pentru a stabili toate detaliile suplimentare.

Disponibilitatea camerelor pe aceasta platforma este garantata de catre parteneri!

Ai intampinat probleme?
Suntem aici sa mediem orice probleme aparute intre tine si partenerii prezenti pe platforma noastra. Acceseaza ${contactFormUrl} pentru a raporta o problema.

Echipa OMD ${emailVariables.destination_name} iti ureaza sejur de poveste!

© 2026 Platforma gestionata prin destexplore.eu
    `.trim();

    console.log('HTML email created with variables:', {
      name: emailVariables.name,
      destination: emailVariables.destination_name,
      business: emailVariables.business_name,
      contactFormUrl,
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

    // Normalize recipients
    const normalizedRecipients = recipients.map(r => ({
      ...r,
      email: r.email.toLowerCase().trim(),
    }));

    // Prepare MailerSend request payload - using HTML email directly instead of template
    const mailerSendPayload = {
      from: {
        email: 'no-reply@destexplore.eu',
        name: 'DestExplore',
      },
      to: normalizedRecipients.map(r => ({ 
        email: r.email,
        name: r.name,
      })),
      subject: `Confirmare Rezervare - ${finalBusiness.name}`,
      html: htmlEmail,
      text: textEmail,
    };

    console.log('Sending HTML email via MailerSend:', {
      recipients: normalizedRecipients.map(r => r.email),
      subject: mailerSendPayload.subject,
      htmlLength: htmlEmail.length,
      textLength: textEmail.length,
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
        recipient_email: normalizedRecipients.map(r => r.email).join(', '),
        subject: `Confirmare Rezervare - ${finalBusiness.name}`,
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
      sentTo: normalizedRecipients.map(r => r.email),
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

