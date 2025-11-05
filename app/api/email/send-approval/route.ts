import { NextRequest, NextResponse } from 'next/server';
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipientName, businessName, businessType, recipientEmail } = body;

    // Validate inputs
    if (!recipientName || !businessName || !businessType || !recipientEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const mailerSend = new MailerSend({
      apiKey: process.env.MAILER_SEND_API_KEY || '',
    });

    if (!process.env.MAILER_SEND_API_KEY) {
      throw new Error('MAILER_SEND_API_KEY is not configured');
    }

    const sender = new Sender(
      "test-z0vklo6pvy7l7qrx.mlsender.net",
      "Your OMD Team"
    );

    // For trial accounts, MailerSend only allows sending to verified admin email
    // Temporarily override recipient to admin email while in trial mode
    const isTrialMode = process.env.MAILER_SEND_TRIAL_MODE === 'true';
    const actualRecipient = isTrialMode ? 'filip.alex24@gmail.com' : recipientEmail;
    
    const recipients = [
      new Recipient(actualRecipient, recipientName),
    ];

    // Determine the welcome message based on business type (Romanian)
    const getBusinessTypeMessage = () => {
      switch (businessType) {
        case 'hotel':
          return "Bine ai venit în familia noastră de ospitalitate! Listarea hotelului tău este acum activă și gata să primească rezervări de la călători.";
        case 'restaurant':
          return "Bine ai venit în comunitatea noastră culinară! Restaurantul tău este acum activ și gata să primească clienți.";
        case 'experience':
          return "Bine ai venit pe platforma noastră de experiențe! Experiența ta este acum activă și gata să creeze momente memorabile pentru vizitatori.";
        default:
          return "Bine ai venit pe platforma noastră! Listarea afacerii tale este acum activă.";
      }
    };

    const getNextStepsMessage = () => {
      switch (businessType) {
        case 'hotel':
          return "Poți acum să configurezi camerele, să gestionezi disponibilitatea și să începi să accepti rezervări.";
        case 'restaurant':
          return "Poți acum să gestionezi meniul, să actualizezi programul și să începi să accepti cereri de rezervare.";
        case 'experience':
          return "Poți acum să configurezi sloturile de timp, să gestionezi disponibilitatea și să începi să accepti rezervări.";
        default:
          return "Poți acum să gestionezi detaliile afacerii tale și să începi să primești solicitări.";
      }
    };

    // Get base URL for contact form and dashboard links
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://destexplore.eu';
    const contactFormUrl = `${baseUrl}/contact`;
    const dashboardUrl = `${baseUrl}/business/dashboard`;

    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo(recipients)
      .setReplyTo(sender)
      .setSubject(`Felicitări! Afacerea ta ${businessName} a fost aprobată`)
      .setHtml(`
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Afacere Aprobată</title>
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
        .header-emoji {
            font-size: 64px;
            margin-bottom: 15px;
            display: block;
        }
        .header-title {
            font-size: 28px;
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
            background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
            padding: 25px;
            border-radius: 12px;
            margin: 25px 0;
            border-left: 5px solid #4caf50;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .business-name {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            text-align: center;
            margin: 10px 0;
        }
        .next-steps-box {
            background: linear-gradient(135deg, #fff3cd 0%, #ffe082 100%);
            padding: 25px;
            border-radius: 12px;
            margin: 25px 0;
            border-left: 5px solid #ffc107;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .next-steps-box strong {
            display: block;
            font-size: 18px;
            color: #856404;
            margin-bottom: 15px;
        }
        .next-steps-box ul {
            margin: 0;
            padding-left: 20px;
            color: #856404;
        }
        .next-steps-box li {
            margin-bottom: 10px;
            line-height: 1.6;
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
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }
        .contact-link {
            text-align: center;
            margin: 25px 0;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 12px;
        }
        .contact-link a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
            border-bottom: 2px solid #667eea;
            padding-bottom: 2px;
        }
        .contact-link a:hover {
            color: #764ba2;
            border-bottom-color: #764ba2;
        }
        .footer {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 2px solid #e0e0e0;
            font-size: 14px;
            color: #666;
            text-align: center;
        }
        .footer-signature {
            font-size: 16px;
            font-weight: 600;
            color: #2c3e50;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-header">
            <span class="header-emoji">🎉</span>
            <h1 class="header-title">Felicitări!</h1>
        </div>
        
        <div class="email-container">
            <div class="greeting">Salut ${recipientName}!</div>

            <div class="content">
                <p>Suntem încântați să îți anunțăm că înregistrarea afacerii tale a fost revizuită și <strong>aprobată</strong> de echipa noastră!</p>

                <div class="highlight-box">
                    <div class="business-name">${businessName}</div>
                </div>

                <p>${getBusinessTypeMessage()}</p>

                <div class="next-steps-box">
                    <strong>Următorii pași:</strong>
                    <ul>
                        <li>Conectează-te în panoul de administrare al afacerii tale</li>
                        <li>Completează profilul afacerii cu toate detaliile</li>
                        <li>Încarcă fotografii pentru a-ți prezenta afacerea</li>
                        <li>${getNextStepsMessage()}</li>
                    </ul>
                </div>

                <div class="cta-container">
                    <a href="${dashboardUrl}" class="cta-button">Accesează Panoul de Administrare</a>
                </div>

                <div class="contact-link">
                    <p style="margin: 0; color: #555;">
                        Ai întrebări sau ai nevoie de asistență? 
                        <a href="${contactFormUrl}">Completează formularul nostru de contact</a> 
                        și îți vom răspunde cât mai curând.
                    </p>
                </div>
            </div>

            <div class="footer">
                <p>Mulțumim că faci parte din comunitatea noastră!</p>
                <p class="footer-signature">Cu respect,<br>Echipa OMD</p>
            </div>
        </div>
    </div>
</body>
</html>
      `)
      .setText(`
Salut ${recipientName}!

Suntem încântați să îți anunțăm că înregistrarea afacerii tale a fost revizuită și APROBATĂ de echipa noastră!

🎉 AFACEREA TA: ${businessName}

${getBusinessTypeMessage()}

URMĂTORII PAȘI:
- Conectează-te în panoul de administrare al afacerii tale
- Completează profilul afacerii cu toate detaliile
- Încarcă fotografii pentru a-ți prezenta afacerea
- ${getNextStepsMessage()}

Dacă ai întrebări sau ai nevoie de asistență, poți completa formularul nostru de contact la ${contactFormUrl} și îți vom răspunde cât mai curând.

Mulțumim că faci parte din comunitatea noastră!

Cu respect,
Echipa OMD
      `);

    await mailerSend.email.send(emailParams);

    return NextResponse.json({ 
      success: true,
      trialMode: isTrialMode,
      message: isTrialMode 
        ? `Email sent to admin (trial mode): ${actualRecipient}. Original recipient: ${recipientEmail}`
        : 'Email sent successfully'
    });
  } catch (error) {
    console.error('Error sending approval email:', error);
    
    // More detailed error logging
    let errorMessage = 'Unknown error';
    let errorDetails: any = null;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
      
      // If it's a MailerSend error, extract more details
      if ((error as any).body) {
        errorDetails.mailersendError = (error as any).body;
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to send email', 
        details: errorMessage,
        fullError: errorDetails 
      },
      { status: 500 }
    );
  }
}

