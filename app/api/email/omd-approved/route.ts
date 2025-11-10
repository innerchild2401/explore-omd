import { NextRequest, NextResponse } from 'next/server';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  try {
    const { omdId } = await request.json();

    if (!omdId) {
      return NextResponse.json(
        { error: 'omdId is required' },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    const { data: omd, error: omdError } = await supabase
      .from('omds')
      .select('id, name, slug, status')
      .eq('id', omdId)
      .single();

    if (omdError || !omd) {
      return NextResponse.json(
        { error: 'OMD not found' },
        { status: 404 },
      );
    }

    const { data: omdAdmins, error: adminsError } = await supabase
      .from('user_profiles')
      .select('id, profile')
      .eq('omd_id', omdId)
      .eq('role', 'omd_admin');

    if (adminsError) {
      throw adminsError;
    }

    if (!omdAdmins || omdAdmins.length === 0) {
      return NextResponse.json(
        { error: 'No OMD admin found for destination' },
        { status: 404 },
      );
    }

    const mailerSendApiKey = process.env.MAILER_SEND_API_KEY;
    if (!mailerSendApiKey) {
      return NextResponse.json(
        { error: 'MailerSend API key not configured' },
        { status: 500 },
      );
    }

    const mailerSend = new MailerSend({ apiKey: mailerSendApiKey });

    const senderEmail = process.env.MAILER_SEND_SENDER_EMAIL || 'no-reply@destexplore.eu';
    const senderName = process.env.MAILER_SEND_SENDER_NAME || 'Echipa DestExplore';
    const sender = new Sender(senderEmail, senderName);

    const isTrialMode = process.env.MAILER_SEND_TRIAL_MODE === 'true';
    const trialRecipient = process.env.MAILER_SEND_TRIAL_EMAIL || 'filip.alex24@gmail.com';

    const recipients: Recipient[] = [];
    const originalRecipients: string[] = [];

    for (const admin of omdAdmins) {
      const { data: user } = await supabase.auth.admin.getUserById(admin.id);
      const email = user?.user?.email;

      if (email) {
        originalRecipients.push(email);
        recipients.push(new Recipient(isTrialMode ? trialRecipient : email, admin.profile?.name || email));

        if (isTrialMode) {
          break;
        }
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No valid recipient email found' },
        { status: 400 },
      );
    }

    const adminDashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://destexplore.eu'}/${omd.slug}/admin`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="ro">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Destinație aprobată</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: #f4f6fb;
        margin: 0;
        padding: 0;
        color: #1f2937;
      }
      .wrapper {
        max-width: 640px;
        margin: 0 auto;
        padding: 32px 16px;
      }
      .card {
        background: #ffffff;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(79, 114, 205, 0.15);
      }
      .card-header {
        background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
        padding: 48px 40px;
        text-align: center;
        color: #ffffff;
      }
      .card-header h1 {
        margin: 0;
        font-size: 30px;
        font-weight: 700;
        letter-spacing: 0.01em;
      }
      .card-content {
        padding: 40px;
      }
      .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 999px;
        background: rgba(79, 114, 205, 0.12);
        color: #1e40af;
        font-weight: 600;
        margin-bottom: 24px;
      }
      .hero-title {
        font-size: 26px;
        font-weight: 700;
        margin: 0 0 16px;
        color: #111827;
      }
      .hero-subtitle {
        font-size: 16px;
        line-height: 1.6;
        margin: 0 0 28px;
        color: #4b5563;
      }
      .next-steps {
        border-radius: 20px;
        background: rgba(79, 114, 205, 0.08);
        padding: 28px;
        margin-bottom: 32px;
      }
      .next-steps h3 {
        margin: 0 0 16px;
        font-size: 18px;
        font-weight: 700;
        color: #1e3a8a;
      }
      .next-steps ul {
        padding: 0;
        margin: 0;
        list-style: none;
      }
      .next-steps li {
        display: flex;
        gap: 12px;
        margin-bottom: 14px;
        font-size: 15px;
        color: #1f2937;
      }
      .cta-button {
        display: inline-block;
        padding: 16px 32px;
        border-radius: 16px;
        background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
        color: #ffffff !important;
        text-decoration: none;
        font-weight: 600;
        font-size: 16px;
        box-shadow: 0 10px 30px rgba(79, 114, 205, 0.3);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        margin-bottom: 32px;
      }
      .info-card {
        border-radius: 18px;
        background: #111827;
        color: #f9fafb;
        padding: 24px;
        margin-bottom: 32px;
      }
      .info-card h4 {
        margin: 0 0 12px;
        font-size: 16px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: rgba(255, 255, 255, 0.7);
      }
      .info-card p {
        margin: 4px 0;
        font-size: 18px;
        font-weight: 600;
      }
      .footer {
        text-align: center;
        color: #6b7280;
        font-size: 13px;
        padding: 0 40px 40px;
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="card">
        <div class="card-header">
          <h1>Destinația ta este oficial live!</h1>
        </div>
        <div class="card-content">
          <div class="hero-badge">
            <span>🏖️</span>
            <span>${omd.name}</span>
          </div>
          <h2 class="hero-title">Felicitări! Destinația ${omd.name} a fost aprobată de echipa DestExplore.</h2>
          <p class="hero-subtitle">
            Poți începe chiar acum să configurezi secțiunile publice, să adaugi afaceri locale și să creezi experiențe memorabile pentru vizitatori.
          </p>

          <div class="next-steps">
            <h3>Următorii pași recomandați</h3>
            <ul>
              <li>✅ Intră în panoul de administrare și personalizează secțiunile de pe homepage.</li>
              <li>🏨 Adaugă hoteluri, restaurante și experiențe reprezentative pentru destinație.</li>
              <li>🎨 Ajustează culorile și template-ul pentru a reflecta identitatea brandului local.</li>
              <li>👥 Invită parteneri locali să își gestioneze listările și disponibilitatea.</li>
            </ul>
          </div>

          <a class="cta-button" href="${adminDashboardUrl}">
            Deschide panoul OMD
          </a>

          <div class="info-card">
            <h4>Detalii destinație</h4>
            <p>Nume: ${omd.name}</p>
            <p>Adresă publică: https://destexplore.eu/${omd.slug}</p>
          </div>

          <p class="hero-subtitle" style="margin-bottom: 0;">
            Dacă ai nevoie de ajutor, răspunde la acest email sau contactează-ne oricând. Suntem alături de tine la fiecare pas.
          </p>
        </div>
        <div class="footer">
          Cu entuziasm,<br />
          <strong>Echipa DestExplore</strong>
        </div>
      </div>
    </div>
  </body>
</html>
    `.trim();

    const textContent = `
Felicitări! Destinația ${omd.name} a fost aprobată de echipa DestExplore.

Următorii pași recomandați:
- Intră în panoul de administrare și personalizează secțiunile publice.
- Adaugă hoteluri, restaurante și experiențe reprezentative.
- Ajustează template-ul și culorile pentru a reflecta brandul destinației.
- Invită parteneri locali să își gestioneze listările.

Panou administrare: ${adminDashboardUrl}
Adresă publică destinație: https://destexplore.eu/${omd.slug}

Suntem aici dacă ai nevoie de suport.
    `.trim();

    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo(recipients)
      .setSubject(`Destinația ${omd.name} este acum live pe DestExplore`)
      .setHtml(htmlContent)
      .setText(textContent);

    await mailerSend.email.send(emailParams);

    return NextResponse.json({
      success: true,
      trialMode: isTrialMode,
      originalRecipients,
    });
  } catch (error: any) {
    console.error('Error sending OMD approval email:', error);
    return NextResponse.json(
      {
        error: 'Failed to send OMD approval email',
        details: error.message || 'Unknown error',
      },
      { status: 500 },
    );
  }
}


