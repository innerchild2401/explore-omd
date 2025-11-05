import { createClient } from '@/lib/supabase/server';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import { generateEmailToken } from './tokens';

interface ReservationData {
  id: string;
  confirmation_number: string;
  check_in_date: string;
  check_out_date: string;
  reservation_status: string;
  guest_profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
  hotels: {
    id: string;
    businesses: {
      name: string;
    };
  };
}

/**
 * Send post-booking follow-up email (3 days after booking)
 */
export async function sendPostBookingFollowupEmail(reservationId: string): Promise<boolean> {
  const supabase = await createClient();

  // Get reservation details with guest and hotel info
  const { data: reservation, error: reservationError } = await supabase
    .from('reservations')
    .select(`
      id,
      confirmation_number,
      check_in_date,
      check_out_date,
      reservation_status,
      guest_profiles!guest_id(
        first_name,
        last_name,
        email
      ),
      hotels!hotel_id(
        id,
        businesses!business_id(
          name
        )
      )
    `)
    .eq('id', reservationId)
    .single();

  if (reservationError || !reservation) {
    console.error('Error fetching reservation for email:', reservationError);
    return false;
  }

  const reservationData = reservation as unknown as ReservationData;

  // Check if reservation is still valid
  if (reservationData.reservation_status !== 'confirmed' && reservationData.reservation_status !== 'tentative') {
    return false;
  }

  // Check if email was already sent
  const { data: emailLog } = await supabase
    .from('email_sequence_logs')
    .select('id, status')
    .eq('reservation_id', reservationId)
    .eq('email_type', 'post_booking_followup')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (emailLog && emailLog.status === 'sent') {
    return false; // Already sent
  }

  const guestEmail = reservationData.guest_profiles.email;
  const guestName = `${reservationData.guest_profiles.first_name} ${reservationData.guest_profiles.last_name}`;
  const hotelName = reservationData.hotels.businesses.name;

  // Generate secure tokens for links
  const ratingToken = generateEmailToken(reservationId, guestEmail);
  const issueToken = generateEmailToken(reservationId, guestEmail);

  // Get base URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://destexplore.eu';
  const ratingUrl = `${baseUrl}/feedback/reservation-staff-rating?reservationId=${reservationId}&token=${ratingToken}`;
  const issueUrl = `${baseUrl}/feedback/booking-issue?reservationId=${reservationId}&token=${issueToken}`;
  const contactUrl = `${baseUrl}/contact`;

  // Format dates
  const checkInDate = new Date(reservationData.check_in_date).toLocaleDateString('ro-RO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const checkOutDate = new Date(reservationData.check_out_date).toLocaleDateString('ro-RO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Send email via MailerSend
  try {
    const mailerSend = new MailerSend({
      apiKey: process.env.MAILER_SEND_API_KEY || '',
    });

    if (!process.env.MAILER_SEND_API_KEY) {
      throw new Error('MAILER_SEND_API_KEY is not configured');
    }

    const sender = new Sender(
      process.env.MAILER_SEND_SENDER_EMAIL || 'test-z0vklo6pvy7l7qrx.mlsender.net',
      process.env.MAILER_SEND_SENDER_NAME || 'Echipa OMD'
    );

    const isTrialMode = process.env.MAILER_SEND_TRIAL_MODE === 'true';
    const actualRecipient = isTrialMode ? 'filip.alex24@gmail.com' : guestEmail;

    const recipients = [new Recipient(actualRecipient, guestName)];

    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo(recipients)
      .setReplyTo(sender)
      .setSubject('Cum a fost experiența ta de rezervare?')
      .setHtml(generateEmailHTML(guestName, hotelName, reservationData.confirmation_number, checkInDate, checkOutDate, ratingUrl, issueUrl, contactUrl))
      .setText(generateEmailText(guestName, hotelName, reservationData.confirmation_number, checkInDate, checkOutDate, ratingUrl, issueUrl, contactUrl));

    await mailerSend.email.send(emailParams);

    // Update email log - find the most recent scheduled log
    const { data: emailLogs } = await supabase
      .from('email_sequence_logs')
      .select('id')
      .eq('reservation_id', reservationId)
      .eq('email_type', 'post_booking_followup')
      .eq('status', 'scheduled')
      .order('created_at', { ascending: false })
      .limit(1);

    if (emailLogs && emailLogs.length > 0) {
      await supabase
        .from('email_sequence_logs')
        .update({
          sent_at: new Date().toISOString(),
          status: 'sent',
        })
        .eq('id', emailLogs[0].id);
    }

    return true;
  } catch (error: any) {
    console.error('Error sending post-booking follow-up email:', error);

    // Update email log with error - find the most recent scheduled log
    const { data: emailLogs } = await supabase
      .from('email_sequence_logs')
      .select('id')
      .eq('reservation_id', reservationId)
      .eq('email_type', 'post_booking_followup')
      .eq('status', 'scheduled')
      .order('created_at', { ascending: false })
      .limit(1);

    if (emailLogs && emailLogs.length > 0) {
      await supabase
        .from('email_sequence_logs')
        .update({
          status: 'failed',
          error_message: error.message || 'Failed to send email',
        })
        .eq('id', emailLogs[0].id);
    }

    return false;
  }
}

function generateEmailHTML(
  guestName: string,
  hotelName: string,
  confirmationNumber: string,
  checkInDate: string,
  checkOutDate: string,
  ratingUrl: string,
  issueUrl: string,
  contactUrl: string
): string {
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cum a fost experiența ta de rezervare?</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .email-wrapper {
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        .email-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            color: #ffffff;
        }
        .email-container {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 22px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 20px;
        }
        .content {
            margin-bottom: 30px;
            color: #555;
            font-size: 16px;
        }
        .highlight-box {
            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
            padding: 25px;
            border-radius: 12px;
            margin: 25px 0;
            border-left: 5px solid #2196f3;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .reservation-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .reservation-details strong {
            color: #2c3e50;
        }
        .actions-container {
            margin: 35px 0;
        }
        .action-button {
            display: inline-block;
            padding: 14px 30px;
            margin: 10px 5px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .action-button.secondary {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
        }
        .footer {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 2px solid #e0e0e0;
            font-size: 14px;
            color: #666;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-header">
            <h1 style="margin: 0; font-size: 28px;">Cum a fost experiența ta?</h1>
        </div>
        
        <div class="email-container">
            <div class="greeting">Salut ${guestName}!</div>

            <div class="content">
                <p>Au trecut 3 zile de la rezervarea ta la <strong>${hotelName}</strong>. Ne-am gândit să verificăm dacă totul a mers conform așteptărilor în procesul de rezervare.</p>

                <div class="highlight-box">
                    <p style="margin: 0; font-weight: 600; color: #1976d2;"><strong>Experiența ta este importantă pentru noi!</strong></p>
                    <p style="margin: 10px 0 0 0;">Dacă totul a fost în regulă, ne-ar ajuta mult să știm și să poți evalua serviciul de rezervări al hotelului. Feedback-ul tău ne ajută să îmbunătățim continuu serviciile oferite.</p>
                </div>

                <p><strong>Ai întâmpinat probleme?</strong></p>
                <p>Dacă ai întâmpinat probleme sau dacă ceva nu a funcționat conform așteptărilor, te rugăm să ne anunți. Suntem aici pentru a te ajuta.</p>

                <div class="reservation-details">
                    <p style="margin: 5px 0;"><strong>Număr confirmare:</strong> ${confirmationNumber}</p>
                    <p style="margin: 5px 0;"><strong>Hotel:</strong> ${hotelName}</p>
                    <p style="margin: 5px 0;"><strong>Check-in:</strong> ${checkInDate}</p>
                    <p style="margin: 5px 0;"><strong>Check-out:</strong> ${checkOutDate}</p>
                </div>

                <div class="actions-container" style="text-align: center;">
                    <a href="${ratingUrl}" class="action-button">⭐ Evaluare serviciu de rezervări</a>
                    <a href="${issueUrl}" class="action-button secondary">📝 Raportează problemă</a>
                </div>

                <p style="text-align: center; color: #666; font-size: 14px;">
                    Dacă ai întrebări sau ai nevoie de asistență, poți <a href="${contactUrl}" style="color: #667eea;">completa formularul nostru de contact</a>.
                </p>
            </div>

            <div class="footer">
                <p>Cu respect,<br><strong>Echipa OMD</strong></p>
            </div>
        </div>
    </div>
</body>
</html>
  `;
}

function generateEmailText(
  guestName: string,
  hotelName: string,
  confirmationNumber: string,
  checkInDate: string,
  checkOutDate: string,
  ratingUrl: string,
  issueUrl: string,
  contactUrl: string
): string {
  return `
Salut ${guestName}!

Au trecut 3 zile de la rezervarea ta la ${hotelName}. Ne-am gândit să verificăm dacă totul a mers conform așteptărilor în procesul de rezervare.

Experiența ta este importantă pentru noi!

Dacă totul a fost în regulă, ne-ar ajuta mult să știm și să poți evalua serviciul de rezervări al hotelului. Feedback-ul tău ne ajută să îmbunătățim continuu serviciile oferite.

Ai întâmpinat probleme?

Dacă ai întâmpinat probleme sau dacă ceva nu a funcționat conform așteptărilor, te rugăm să ne anunți. Suntem aici pentru a te ajuta.

Detalii rezervare:
- Număr confirmare: ${confirmationNumber}
- Hotel: ${hotelName}
- Check-in: ${checkInDate}
- Check-out: ${checkOutDate}

Acțiuni rapide:
1. Evaluare serviciu de rezervări: ${ratingUrl}
2. Raportează problemă: ${issueUrl}

Dacă ai întrebări sau ai nevoie de asistență, poți completa formularul nostru de contact: ${contactUrl}

Cu respect,
Echipa OMD
  `;
}

