import { createServiceRoleClient } from '@/lib/supabase/server';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { rateLimitCheck } from '@/lib/middleware/rate-limit';
import { validateRequest } from '@/lib/validation/validate';
import { contactFormSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await rateLimitCheck(request, 'public');
  if (!rateLimit.success) {
    return rateLimit.response!;
  }
  try {
    // Validate request body
    const validation = await validateRequest(request, contactFormSchema);
    if (!validation.success) {
      return validation.response;
    }
    const { nume, email, mesaj, omdSlug } = validation.data;

    // Use service role client to bypass RLS for public form submissions
    const supabase = createServiceRoleClient();

    let omdId: string | null = null;
    if (omdSlug) {
      const { data: omd } = await supabase
        .from('omds')
        .select('id')
        .eq('slug', omdSlug)
        .single();

      if (omd) {
        omdId = omd.id;
      }
    }

    const { data, error } = await supabase
      .from('contact_inquiries')
      .insert({
        name: nume,
        email,
        message: mesaj,
        status: 'new',
        omd_id: omdId,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error inserting contact inquiry', error, {
        omdSlug,
        email,
      });
      return NextResponse.json(
        { error: 'A apărut o eroare. Vă rugăm încercați din nou.' },
        { status: 500 },
      );
    }

    // Get superadmin email from database
    let superadminEmail: string | null = null;
    try {
      const { data: superadminProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'super_admin')
        .limit(1)
        .single();

      if (superadminProfile?.id) {
        const { data: superadminUser, error: userError } = await supabase.auth.admin.getUserById(superadminProfile.id);
        if (!userError && superadminUser?.user?.email) {
          superadminEmail = superadminUser.user.email;
        }
      }
    } catch (adminError) {
      logger.error('Error fetching superadmin email', adminError);
    }

    const mailerSendApiKey = process.env.MAILER_SEND_API_KEY;
    if (mailerSendApiKey) {
      try {
        const mailerSend = new MailerSend({ apiKey: mailerSendApiKey });

        const senderEmail = process.env.MAILER_SEND_SENDER_EMAIL || 'no-reply@destexplore.eu';
        const senderName = process.env.MAILER_SEND_SENDER_NAME || 'DestExplore Marketing';
        const sender = new Sender(senderEmail, senderName);

        // Use superadmin email, fallback to env vars, then to default
        const primaryRecipient =
          superadminEmail ||
          process.env.MARKETING_CONTACT_EMAIL ||
          process.env.MAILER_SEND_TRIAL_EMAIL ||
          'filip.alex24@gmail.com';

        const isTrialMode = process.env.MAILER_SEND_TRIAL_MODE === 'true';
        const recipients = [
          new Recipient(primaryRecipient, 'Super Admin DestExplore'),
        ];

        const subject = '✉️ Nou mesaj din formularul de prezentare DestExplore';
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://destexplore.eu';
        const dashboardUrl = `${baseUrl}/admin`;

        const htmlContent = `
<!DOCTYPE html>
<html lang="ro">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nou mesaj DestExplore</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: #f0f4ff;
        margin: 0;
        padding: 0;
        color: #1f2937;
      }
      .wrapper {
        max-width: 680px;
        margin: 0 auto;
        padding: 32px 16px;
      }
      .card {
        background: #ffffff;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 24px 70px rgba(30, 64, 175, 0.18);
      }
      .card-header {
        background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #1d4ed8 100%);
        padding: 48px 40px;
        text-align: center;
        color: #ffffff;
      }
      .card-header h1 {
        margin: 0;
        font-size: 30px;
        font-weight: 700;
      }
      .card-content {
        padding: 40px;
      }
      .lead {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 18px;
        border-radius: 999px;
        background: rgba(59, 130, 246, 0.12);
        color: #1d4ed8;
        font-weight: 600;
        margin-bottom: 24px;
      }
      .message-block {
        border-radius: 20px;
        background: rgba(37, 99, 235, 0.08);
        padding: 28px;
        margin: 24px 0;
        color: #1f2937;
        line-height: 1.6;
      }
      .details {
        border-radius: 18px;
        background: #0f172a;
        color: #f8fafc;
        padding: 24px;
        margin-top: 28px;
      }
      .details h3 {
        margin: 0 0 16px;
        font-size: 16px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: rgba(148, 163, 184, 0.9);
      }
      .details p {
        margin: 6px 0;
        font-size: 18px;
        font-weight: 600;
      }
      .cta-button {
        display: inline-block;
        padding: 16px 32px;
        border-radius: 16px;
        background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
        color: #ffffff !important;
        text-decoration: none;
        font-weight: 600;
        font-size: 16px;
        margin-top: 28px;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        box-shadow: 0 12px 35px rgba(37, 99, 235, 0.3);
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
          <h1>Ai un nou lead pentru DestExplore</h1>
        </div>
        <div class="card-content">
          <div class="lead">
            <span>📬</span>
            <span>Formular de prezentare completat</span>
          </div>

          <p>
            ${nume} vrea să discute despre cum poate implementa DestExplore pentru destinația sa.
            Mesajul a fost salvat în baza de date și îl poți găsi și în zona de "Contact inquiries".
          </p>

          <div class="message-block">
            <strong>Mesajul trimis:</strong>
            <br /><br />
            ${mesaj.replace(/\n/g, '<br />')}
          </div>

          <div class="details">
            <h3>Detalii contact</h3>
            <p>Nume: ${nume}</p>
            <p>Email: ${email}</p>
            ${omdSlug ? `<p>Destinație interesată: ${omdSlug}</p>` : ''}
          </div>

          <a class="cta-button" href="${dashboardUrl}">
            Deschide panoul de administrare
          </a>
        </div>
        <div class="footer">
          Acest email este generat automat de formularul de prezentare DestExplore.
        </div>
      </div>
    </div>
  </body>
</html>
        `.trim();

        const textContent = `
Nou mesaj din formularul DestExplore

Nume: ${nume}
Email: ${email}
${omdSlug ? `Destinație interesată: ${omdSlug}` : ''}

Mesaj:
${mesaj}

Panou administrare: ${dashboardUrl}
        `.trim();

        const emailParams = new EmailParams()
          .setFrom(sender)
          .setTo(recipients)
          .setSubject(subject)
          .setHtml(htmlContent)
          .setText(textContent);

        await mailerSend.email.send(emailParams);
      } catch (mailError) {
        logger.error('Failed to send marketing contact email', mailError, {
          inquiryId: data.id,
        });
      }
    } else {
      logger.warn('MailerSend API key missing – marketing notification email not sent', {
        inquiryId: data.id,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Inquiry submitted successfully',
        data,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error('Error in contact submission', error);
    return NextResponse.json(
      { error: 'A apărut o eroare neașteptată' },
      { status: 500 },
    );
  }
}

