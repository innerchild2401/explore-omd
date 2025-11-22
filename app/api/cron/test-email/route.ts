import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mailersend/service';
import { log } from '@/lib/logger';

/**
 * Test Cron Job - Sends Test Email
 * 
 * This route is called by Vercel Cron to test if cron jobs work.
 * Sends a test email to verify the cron system is functioning.
 * 
 * Security: Verifies CRON_SECRET in Authorization header or x-vercel-cron header
 */

// Force dynamic rendering to prevent caching issues with cron jobs
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Verify this is called by Vercel Cron (same pattern as /api/email/sequence/trigger)
    // Vercel sends a special header when triggering cron jobs
    const cronHeader = req.headers.get('x-vercel-cron');
    const authHeader = req.headers.get('authorization');
    
    // Log all headers for debugging BEFORE auth check
    const allHeaders: Record<string, string | null> = {};
    req.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });

    // Allow if it's from Vercel cron OR has correct auth token
    // For local/dev, allow if no CRON_SECRET is set
    if (!cronHeader) {
      if (process.env.CRON_SECRET) {
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
          log.warn('Cron test email: Unauthorized access attempt', {
            hasAuthHeader: !!authHeader,
            authHeaderValue: authHeader ? 'Bearer ***' : null,
            hasSecret: !!process.env.CRON_SECRET,
            hasVercelCron: false,
            environment: process.env.NODE_ENV,
            allHeaders: allHeaders, // Log headers to see what Vercel sends
          });
          return NextResponse.json(
            { 
              error: 'Unauthorized',
              debug: {
                hasVercelCronHeader: false,
                hasAuthHeader: !!authHeader,
                hasCronSecret: !!process.env.CRON_SECRET,
                environment: process.env.NODE_ENV,
              }
            },
            { status: 401 }
          );
        }
      }
      // If no CRON_SECRET is set, allow (for local development)
    }

    log.info('Cron test email: Authentication passed, starting email send', {
      timestamp: new Date().toISOString(),
      hasVercelCron: !!cronHeader,
      vercelCronValue: cronHeader,
      hasAuthHeader: !!authHeader,
      environment: process.env.NODE_ENV,
      hasCronSecret: !!process.env.CRON_SECRET,
      headers: allHeaders, // Log all headers for debugging
    });

    // Send test email
    const result = await sendEmail({
      to: [{ email: 'afilip.mme@gmail.com', name: 'Test Recipient' }],
      subject: '🧪 Vercel Cron Test - ' + new Date().toLocaleString('ro-RO', { 
        timeZone: 'Europe/Bucharest',
        dateStyle: 'full',
        timeStyle: 'long'
      }),
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .content {
                background: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .success {
                background: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
              }
              .info {
                background: #d1ecf1;
                border: 1px solid #bee5eb;
                color: #0c5460;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
              }
              .details {
                background: white;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                border-left: 4px solid #667eea;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>✅ Vercel Cron Test Successful!</h1>
            </div>
            <div class="content">
              <div class="success">
                <strong>🎉 Congratulations!</strong><br>
                Your Vercel cron job is working correctly!
              </div>
              
              <div class="info">
                <strong>📧 Email Details:</strong><br>
                This email was sent automatically by a Vercel cron job to test the cron system.
              </div>
              
              <div class="details">
                <strong>⏰ Execution Time:</strong><br>
                ${new Date().toLocaleString('ro-RO', { 
                  timeZone: 'Europe/Bucharest',
                  dateStyle: 'full',
                  timeStyle: 'long'
                })}<br>
                <small>(Europe/Bucharest timezone)</small>
              </div>
              
              <div class="details">
                <strong>🔧 Technical Details:</strong><br>
                • Route: /api/cron/test-email<br>
                • Method: POST<br>
                • Triggered by: Vercel Cron<br>
                • Environment: ${process.env.NODE_ENV || 'unknown'}<br>
                • Timestamp: ${new Date().toISOString()}
              </div>
              
              <div class="info">
                <strong>📝 Next Steps:</strong><br>
                If you received this email, your cron jobs are configured correctly!<br>
                You can now implement scheduled tasks like:<br>
                • Auto-regenerating top pages<br>
                • Sending scheduled emails<br>
                • Running maintenance tasks
              </div>
            </div>
            <div class="footer">
              <p>This is an automated test email from Explore OMD Platform</p>
              <p>You can safely delete this email.</p>
            </div>
          </body>
        </html>
      `,
      text: `
Vercel Cron Test Successful!

Congratulations! Your Vercel cron job is working correctly.

Execution Time: ${new Date().toLocaleString('ro-RO', { 
  timeZone: 'Europe/Bucharest',
  dateStyle: 'full',
  timeStyle: 'long'
})}

Technical Details:
- Route: /api/cron/test-email
- Method: POST
- Triggered by: Vercel Cron
- Environment: ${process.env.NODE_ENV || 'unknown'}
- Timestamp: ${new Date().toISOString()}

Next Steps:
If you received this email, your cron jobs are configured correctly!
You can now implement scheduled tasks like auto-regenerating top pages, sending scheduled emails, and running maintenance tasks.

This is an automated test email from Explore OMD Platform.
You can safely delete this email.
      `,
      // Use the same sender pattern as other email routes
      // Make sure MAILER_SEND_FROM_EMAIL is set in .env.local with a verified email
      from: {
        email: process.env.MAILER_SEND_FROM_EMAIL || 'no-reply@destexplore.eu',
        name: process.env.MAILER_SEND_SENDER_NAME || 'Explore OMD',
      },
      tags: ['cron-test', 'vercel-cron'],
      logToDatabase: true,
    });

    if (result.success) {
      log.info('Cron test email: Email sent successfully', {
        messageId: result.messageId,
        logId: result.logId,
        trialMode: result.trialMode,
      });

      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId,
        logId: result.logId,
        timestamp: new Date().toISOString(),
        trialMode: result.trialMode,
        originalRecipients: result.originalRecipients,
      });
    } else {
      log.error('Cron test email: Failed to send email', {
        error: result.error,
        logId: result.logId,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send test email',
          details: result.error,
          logId: result.logId,
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    log.error('Cron test email: Unexpected error', {
      error,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also allow GET for manual testing (with secret in query param)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  // Only allow in development or with correct secret
  if (process.env.NODE_ENV === 'production' && secret !== cronSecret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Call POST handler logic
  return POST(req);
}

