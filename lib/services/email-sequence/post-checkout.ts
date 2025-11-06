import { createClient } from '@/lib/supabase/server';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

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
      omd_id: string;
    };
  };
}

/**
 * Check if an issue was reported for this reservation
 * If an issue was reported, skip second and third emails
 */
async function hasIssueReport(reservationId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: issueReport } = await supabase
    .from('booking_issue_reports')
    .select('id')
    .eq('reservation_id', reservationId)
    .eq('status', 'open')
    .maybeSingle();

  return !!issueReport;
}

/**
 * Send post-checkout email (1 day after check-out)
 * Only if no issue was reported
 * Asks them to rate the destination
 */
export async function sendPostCheckoutEmail(reservationId: string): Promise<boolean> {
  const supabase = await createClient();

  // Check if issue was reported - if so, skip this email
  const hasIssue = await hasIssueReport(reservationId);
  if (hasIssue) {
    // Mark email as skipped
    const { data: emailLogs } = await supabase
      .from('email_sequence_logs')
      .select('id')
      .eq('reservation_id', reservationId)
      .eq('email_type', 'post_checkout')
      .eq('status', 'scheduled')
      .order('created_at', { ascending: false })
      .limit(1);

    if (emailLogs && emailLogs.length > 0) {
      await supabase
        .from('email_sequence_logs')
        .update({
          status: 'skipped',
          error_message: 'Issue reported - skipping email sequence',
        })
        .eq('id', emailLogs[0].id);
    }
    return false;
  }

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
          name,
          omd_id
        )
      )
    `)
    .eq('id', reservationId)
    .single();

  if (reservationError || !reservation) {
    console.error('Error fetching reservation for post-checkout email:', reservationError);
    return false;
  }

  const reservationData = reservation as unknown as ReservationData;

  // Check if reservation is still valid (checked out or completed)
  if (reservationData.reservation_status !== 'checked_out' && 
      reservationData.reservation_status !== 'confirmed' &&
      reservationData.reservation_status !== 'checked_in') {
    return false;
  }

  // Get OMD details separately
  const omdId = (reservationData.hotels.businesses as any).omd_id;
  const { data: omd } = await supabase
    .from('omds')
    .select('slug, name')
    .eq('id', omdId)
    .single();

  if (!omd) {
    console.error('Error fetching OMD details');
    return false;
  }

  // Check if email was already sent
  const { data: emailLog } = await supabase
    .from('email_sequence_logs')
    .select('id, status')
    .eq('reservation_id', reservationId)
    .eq('email_type', 'post_checkout')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (emailLog && emailLog.status === 'sent') {
    return false; // Already sent
  }

  const guestEmail = reservationData.guest_profiles.email;
  const guestName = `${reservationData.guest_profiles.first_name} ${reservationData.guest_profiles.last_name}`;
  const hotelName = reservationData.hotels.businesses.name;
  const omdSlug = omd.slug;
  const omdName = omd.name;

  // Get base URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://destexplore.eu';
  const destinationUrl = `${baseUrl}/${omdSlug}`;
  const ratingUrl = `${baseUrl}/${omdSlug}/rate`;

  // Send email via MailerSend
  try {
    const mailerSend = new MailerSend({
      apiKey: process.env.MAILER_SEND_API_KEY || '',
    });

    if (!process.env.MAILER_SEND_API_KEY) {
      throw new Error('MAILER_SEND_API_KEY is not configured');
    }

    const sender = new Sender(
      process.env.MAILER_SEND_SENDER_EMAIL || 'no-reply@destexplore.eu',
      process.env.MAILER_SEND_SENDER_NAME || 'Echipa OMD'
    );

    const isTrialMode = process.env.MAILER_SEND_TRIAL_MODE === 'true';
    const actualRecipient = isTrialMode ? 'filip.alex24@gmail.com' : guestEmail;

    const recipients = [new Recipient(actualRecipient, guestName)];

    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo(recipients)
      .setReplyTo(sender)
      .setSubject(`Sperăm că te-ai bucurat de ${omdName}!`)
      .setHtml(generateEmailHTML(guestName, omdName, hotelName, destinationUrl, ratingUrl))
      .setText(generateEmailText(guestName, omdName, hotelName, destinationUrl, ratingUrl));

    await mailerSend.email.send(emailParams);

    // Update email log
    const { data: emailLogs } = await supabase
      .from('email_sequence_logs')
      .select('id')
      .eq('reservation_id', reservationId)
      .eq('email_type', 'post_checkout')
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
    console.error('Error sending post-checkout email:', error);

    // Update email log with error
    const { data: emailLogs } = await supabase
      .from('email_sequence_logs')
      .select('id')
      .eq('reservation_id', reservationId)
      .eq('email_type', 'post_checkout')
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
  omdName: string,
  hotelName: string,
  destinationUrl: string,
  ratingUrl: string
): string {
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sperăm că te-ai bucurat de ${omdName}!</title>
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
        .header-title {
            font-size: 32px;
            font-weight: bold;
            margin: 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
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
        .cta-container {
            text-align: center;
            margin: 35px 0;
        }
        .cta-button {
            display: inline-block;
            padding: 16px 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            font-size: 16px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
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
            <h1 class="header-title">Mulțumim! 🙏</h1>
        </div>
        
        <div class="email-container">
            <div class="greeting">Salut ${guestName}!</div>

            <div class="content">
                <p>Sperăm că te-ai bucurat de șederea ta la <strong>${hotelName}</strong> și că ai petrecut momente frumoase în ${omdName}!</p>

                <p>Experiența ta este importantă pentru noi. Ne-ar face plăcere să ne spui cum ți-a plăcut destinația.</p>

                <div class="cta-container">
                    <a href="${ratingUrl}" class="cta-button">Evaluează ${omdName}</a>
                </div>

                <p style="text-align: center; color: #666; font-size: 14px; margin-top: 20px;">
                    Feedback-ul tău ne ajută să continuăm să oferim experiențe minunate.
                </p>
            </div>

            <div class="footer">
                <p>Îți mulțumim pentru că ai ales ${omdName}!</p>
                <p><strong>Echipa ${omdName}</strong></p>
            </div>
        </div>
    </div>
</body>
</html>
  `;
}

function generateEmailText(
  guestName: string,
  omdName: string,
  hotelName: string,
  destinationUrl: string,
  ratingUrl: string
): string {
  return `
Salut ${guestName}!

Sperăm că te-ai bucurat de șederea ta la ${hotelName} și că ai petrecut momente frumoase în ${omdName}!

Experiența ta este importantă pentru noi. Ne-ar face plăcere să ne spui cum ți-a plăcut destinația.

Evaluează ${omdName}: ${ratingUrl}

Feedback-ul tău ne ajută să continuăm să oferim experiențe minunate.

Îți mulțumim pentru că ai ales ${omdName}!

Echipa ${omdName}
  `;
}

