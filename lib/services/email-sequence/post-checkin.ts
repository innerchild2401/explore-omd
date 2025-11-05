import { createClient } from '@/lib/supabase/server';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import { getFeaturedBusinessesForEmail } from './featured-businesses';

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
 * Send post-checkin email (1 day after check-in)
 * Only if no issue was reported
 */
export async function sendPostCheckinEmail(reservationId: string): Promise<boolean> {
  const supabase = await createClient();

  // Check if issue was reported - if so, skip this email
  const hasIssue = await hasIssueReport(reservationId);
  if (hasIssue) {
    // Mark email as skipped
    const { data: emailLogs } = await supabase
      .from('email_sequence_logs')
      .select('id')
      .eq('reservation_id', reservationId)
      .eq('email_type', 'post_checkin')
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
    console.error('Error fetching reservation for post-checkin email:', reservationError);
    return false;
  }

  const reservationData = reservation as unknown as ReservationData;

  // Check if reservation is still valid (checked in or confirmed)
  if (reservationData.reservation_status !== 'confirmed' && reservationData.reservation_status !== 'checked_in') {
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
    .eq('email_type', 'post_checkin')
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

  // Get featured businesses
  const { restaurants, experiences } = await getFeaturedBusinessesForEmail(omdId);

  // Get base URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://destexplore.eu';
  const exploreUrl = `${baseUrl}/${omdSlug}/explore`;

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
      .setSubject(`Bun venit în ${omdName}!`)
      .setHtml(generateEmailHTML(guestName, omdName, hotelName, restaurants, experiences, exploreUrl, omdSlug))
      .setText(generateEmailText(guestName, omdName, hotelName, restaurants, experiences, exploreUrl, omdSlug));

    await mailerSend.email.send(emailParams);

    // Update email log
    const { data: emailLogs } = await supabase
      .from('email_sequence_logs')
      .select('id')
      .eq('reservation_id', reservationId)
      .eq('email_type', 'post_checkin')
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
    console.error('Error sending post-checkin email:', error);

    // Update email log with error
    const { data: emailLogs } = await supabase
      .from('email_sequence_logs')
      .select('id')
      .eq('reservation_id', reservationId)
      .eq('email_type', 'post_checkin')
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
  restaurants: Array<{ id: string; name: string; slug: string; description: string | null; images: string[]; rating: number }>,
  experiences: Array<{ id: string; name: string; slug: string; description: string | null; images: string[]; rating: number }>,
  exploreUrl: string,
  omdSlug: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://destexplore.eu';

  const restaurantCards = restaurants.map((restaurant) => {
    const imageUrl = restaurant.images && restaurant.images.length > 0 
      ? restaurant.images[0] 
      : 'https://via.placeholder.com/300x200?text=Restaurant';
    const restaurantUrl = `${baseUrl}/${omdSlug}/restaurants/${restaurant.slug}`;
    
    return `
      <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 20px;">
        <img src="${imageUrl}" alt="${restaurant.name}" style="width: 100%; height: 200px; object-fit: cover;">
        <div style="padding: 20px;">
          <h3 style="margin: 0 0 10px 0; font-size: 20px; color: #2c3e50;">${restaurant.name}</h3>
          ${restaurant.description ? `<p style="margin: 0 0 15px 0; color: #666; font-size: 14px; line-height: 1.5;">${restaurant.description.substring(0, 100)}${restaurant.description.length > 100 ? '...' : ''}</p>` : ''}
          <div style="display: flex; justify-content: space-between; align-items: center;">
            ${restaurant.rating > 0 ? `<div style="color: #ffc107; font-weight: bold;">${'★'.repeat(Math.round(restaurant.rating))} ${restaurant.rating.toFixed(1)}</div>` : ''}
            <a href="${restaurantUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Vezi detalii</a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const experienceCards = experiences.map((experience) => {
    const imageUrl = experience.images && experience.images.length > 0 
      ? experience.images[0] 
      : 'https://via.placeholder.com/300x200?text=Experiență';
    const experienceUrl = `${baseUrl}/${omdSlug}/experiences/${experience.slug}`;
    
    return `
      <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 20px;">
        <img src="${imageUrl}" alt="${experience.name}" style="width: 100%; height: 200px; object-fit: cover;">
        <div style="padding: 20px;">
          <h3 style="margin: 0 0 10px 0; font-size: 20px; color: #2c3e50;">${experience.name}</h3>
          ${experience.description ? `<p style="margin: 0 0 15px 0; color: #666; font-size: 14px; line-height: 1.5;">${experience.description.substring(0, 100)}${experience.description.length > 100 ? '...' : ''}</p>` : ''}
          <div style="display: flex; justify-content: space-between; align-items: center;">
            ${experience.rating > 0 ? `<div style="color: #ffc107; font-weight: bold;">${'★'.repeat(Math.round(experience.rating))} ${experience.rating.toFixed(1)}</div>` : ''}
            <a href="${experienceUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Vezi detalii</a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bun venit în ${omdName}!</title>
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
        .highlight-box {
            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
            padding: 25px;
            border-radius: 12px;
            margin: 25px 0;
            border-left: 5px solid #2196f3;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .section-title {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin: 35px 0 20px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #e0e0e0;
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
            <h1 class="header-title">Bun venit în ${omdName}! 🎉</h1>
        </div>
        
        <div class="email-container">
            <div class="greeting">Salut ${guestName}!</div>

            <div class="content">
                <p>Sperăm că ai ajuns bine la <strong>${hotelName}</strong> și că începi să te bucuri de ${omdName}!</p>

                <div class="highlight-box">
                    <p style="margin: 0; font-weight: 600; color: #1976d2;"><strong>Suntem aici pentru tine!</strong></p>
                    <p style="margin: 10px 0 0 0;">Vrem să îți facem șederea cât mai plăcută. Te invităm să explorezi platforma noastră pentru a descoperi tot ce ${omdName} are de oferit.</p>
                </div>

                <p>Am pregătit pentru tine câteva recomandări speciale:</p>

                ${restaurants.length > 0 ? `
                <div class="section-title">🍽️ Restaurante Recomandate</div>
                ${restaurantCards}
                ` : ''}

                ${experiences.length > 0 ? `
                <div class="section-title">🌟 Experiențe Recomandate</div>
                ${experienceCards}
                ` : ''}

                <div class="cta-container">
                    <a href="${exploreUrl}" class="cta-button">Explorează ${omdName}</a>
                </div>

                <p style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
                    Descoperă toate restaurantele, experiențele și locurile de interes pe platforma noastră.
                </p>
            </div>

            <div class="footer">
                <p>Îți dorim o ședere minunată!</p>
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
  restaurants: Array<{ name: string; slug: string; description: string | null }>,
  experiences: Array<{ name: string; slug: string; description: string | null }>,
  exploreUrl: string,
  omdSlug: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://destexplore.eu';
  
  const restaurantList = restaurants.map((r, i) => 
    `${i + 1}. ${r.name}${r.description ? ` - ${r.description.substring(0, 80)}...` : ''}\n   ${baseUrl}/${omdSlug}/restaurants/${r.slug}`
  ).join('\n\n');

  const experienceList = experiences.map((e, i) => 
    `${i + 1}. ${e.name}${e.description ? ` - ${e.description.substring(0, 80)}...` : ''}\n   ${baseUrl}/${omdSlug}/experiences/${e.slug}`
  ).join('\n\n');

  return `
Salut ${guestName}!

Sperăm că ai ajuns bine la ${hotelName} și că începi să te bucuri de ${omdName}!

Suntem aici pentru tine!

Vrem să îți facem șederea cât mai plăcută. Te invităm să explorezi platforma noastră pentru a descoperi tot ce ${omdName} are de oferit.

${restaurants.length > 0 ? `RESTAURANTE RECOMANDATE:\n${restaurantList}\n\n` : ''}${experiences.length > 0 ? `EXPERIENȚE RECOMANDATE:\n${experienceList}\n\n` : ''}Explorează ${omdName}: ${exploreUrl}

Descoperă toate restaurantele, experiențele și locurile de interes pe platforma noastră.

Îți dorim o ședere minunată!

Echipa ${omdName}
  `;
}

