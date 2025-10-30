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

    const recipients = [
      new Recipient(recipientEmail, recipientName),
    ];

    // Determine the welcome message based on business type
    const getBusinessTypeMessage = () => {
      switch (businessType) {
        case 'hotel':
          return "Welcome to our hospitality family! Your hotel listing is now live and ready to receive bookings from travelers.";
        case 'restaurant':
          return "Welcome to our culinary community! Your restaurant is now live and ready to welcome hungry customers.";
        case 'experience':
          return "Welcome to our experiences marketplace! Your experience is now live and ready to create memorable moments for visitors.";
        default:
          return "Welcome to our platform! Your business listing is now live.";
      }
    };

    const getNextStepsMessage = () => {
      switch (businessType) {
        case 'hotel':
          return "You can now set up your rooms, manage availability, and start accepting reservations.";
        case 'restaurant':
          return "You can now manage your menu, update your hours, and start accepting reservation requests.";
        case 'experience':
          return "You can now set up your time slots, manage availability, and start accepting bookings.";
        default:
          return "You can now manage your business details and start receiving inquiries.";
      }
    };

    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo(recipients)
      .setReplyTo(sender)
      .setSubject(`Congratulations! Your ${businessName} has been approved`)
      .setHtml(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Business Approved</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .email-container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .greeting {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .emoji {
            font-size: 48px;
            margin-bottom: 20px;
        }
        .content {
            margin-bottom: 30px;
        }
        .highlight {
            background-color: #e8f5e9;
            padding: 15px;
            border-left: 4px solid #4caf50;
            margin: 20px 0;
            border-radius: 5px;
        }
        .business-name {
            font-size: 20px;
            font-weight: bold;
            color: #2c3e50;
            text-align: center;
            margin: 15px 0;
        }
        .cta-button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #4caf50;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 14px;
            color: #666;
            text-align: center;
        }
        .next-steps {
            background-color: #fff3cd;
            padding: 15px;
            border-left: 4px solid #ffc107;
            margin: 20px 0;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="emoji">🎉</div>
            <div class="greeting">Hello ${recipientName}!</div>
        </div>

        <div class="content">
            <p>We're thrilled to inform you that your business registration has been reviewed and <strong>approved</strong> by our team!</p>

            <div class="highlight">
                <div class="business-name">${businessName}</div>
            </div>

            <p>${getBusinessTypeMessage()}</p>

            <div class="next-steps">
                <strong>Next Steps:</strong>
                <ul>
                    <li>Log in to your business dashboard</li>
                    <li>Complete your business profile with all details</li>
                    <li>Upload photos to showcase your business</li>
                    <li>${getNextStepsMessage()}</li>
                </ul>
            </div>

            <div style="text-align: center;">
                <a href="#" class="cta-button">Go to Your Dashboard</a>
            </div>

            <p>If you have any questions or need assistance, please contact us at <a href="mailto:filip.alex24@gmail.com" style="color: #4caf50; text-decoration: none;"><strong>filip.alex24@gmail.com</strong></a> and we'll get back to you as soon as possible.</p>
        </div>

        <div class="footer">
            <p>Thank you for being part of our community!</p>
            <p>Best regards,<br><strong>Your OMD Team</strong></p>
            <p style="font-size: 12px; color: #999; margin-top: 20px;">
                Have questions? Contact us at <a href="mailto:filip.alex24@gmail.com" style="color: #4caf50;">filip.alex24@gmail.com</a>
            </p>
        </div>
    </div>
</body>
</html>
      `)
      .setText(`
Hello ${recipientName}!

We're thrilled to inform you that your business registration has been reviewed and APPROVED by our team!

BUSINESS NAME: ${businessName}

${getBusinessTypeMessage()}

NEXT STEPS:
- Log in to your business dashboard
- Complete your business profile with all details
- Upload photos to showcase your business
- ${getNextStepsMessage()}

If you have any questions or need assistance, please contact us at filip.alex24@gmail.com and we'll get back to you as soon as possible.

Thank you for being part of our community!

Best regards,
Your OMD Team

---
Have questions? Contact us at filip.alex24@gmail.com
      `);

    await mailerSend.email.send(emailParams);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending approval email:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

