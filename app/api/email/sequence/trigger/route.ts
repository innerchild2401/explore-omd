import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPostBookingFollowupEmail } from '@/lib/services/email-sequence/post-booking-followup';
import { sendPostCheckinEmail } from '@/lib/services/email-sequence/post-checkin';
import { sendPostCheckoutEmail } from '@/lib/services/email-sequence/post-checkout';
import { log } from '@/lib/logger';
import { rateLimitCheck } from '@/lib/middleware/rate-limit';

/**
 * Trigger scheduled email sequence
 * This is called by Vercel cron job (every hour)
 * GET /api/email/sequence/trigger
 * 
 * Vercel cron jobs send a special header that we can verify
 */
export async function GET(request: NextRequest) {
  // Rate limiting (cron jobs should have higher limits)
  const rateLimit = await rateLimitCheck(request, 'api');
  if (!rateLimit.success) {
    return rateLimit.response!;
  }
  // Verify this is a Vercel cron job request
  // Vercel sends a special header when triggering cron jobs
  const cronHeader = request.headers.get('x-vercel-cron');
  const authHeader = request.headers.get('authorization');
  
  // Allow if it's from Vercel cron OR has correct auth token
  // For local/dev, allow if no CRON_SECRET is set
  if (!cronHeader) {
    if (process.env.CRON_SECRET) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    // If no CRON_SECRET is set, allow (for local development)
  }
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // Get all scheduled emails that are due
    const { data: scheduledEmails, error: fetchError } = await supabase
      .from('email_sequence_logs')
      .select('reservation_id, email_type')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .limit(50); // Process in batches

    if (fetchError) {
      throw new Error(`Failed to fetch scheduled emails: ${fetchError.message}`);
    }

    if (!scheduledEmails || scheduledEmails.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No emails to send',
        processed: 0,
      });
    }

    let sent = 0;
    let failed = 0;

    // Process each scheduled email
    for (const emailLog of scheduledEmails) {
      try {
        if (emailLog.email_type === 'post_booking_followup') {
          const success = await sendPostBookingFollowupEmail(emailLog.reservation_id);
          if (success) {
            sent++;
          } else {
            failed++;
          }
        } else if (emailLog.email_type === 'post_checkin') {
          const success = await sendPostCheckinEmail(emailLog.reservation_id);
          if (success) {
            sent++;
          } else {
            failed++;
          }
        } else if (emailLog.email_type === 'post_checkout') {
          const success = await sendPostCheckoutEmail(emailLog.reservation_id);
          if (success) {
            sent++;
          } else {
            failed++;
          }
        }
      } catch (error: any) {
        log.error('Error processing email for reservation', error, {
          reservationId: emailLog.reservation_id,
        });
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: scheduledEmails.length,
      sent,
      failed,
    });
  } catch (error: any) {
    log.error('Error triggering email sequence', error, {});
    return NextResponse.json(
      { error: error.message || 'Failed to trigger email sequence' },
      { status: 500 }
    );
  }
}

/**
 * Also support POST for manual triggers (e.g., from admin dashboard)
 */
export async function POST(request: NextRequest) {
  // For POST requests, we can add authentication check if needed
  // For now, allow POST requests (can be secured later)
  
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // Get all scheduled emails that are due
    const { data: scheduledEmails, error: fetchError } = await supabase
      .from('email_sequence_logs')
      .select('reservation_id, email_type')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .limit(50); // Process in batches

    if (fetchError) {
      throw new Error(`Failed to fetch scheduled emails: ${fetchError.message}`);
    }

    if (!scheduledEmails || scheduledEmails.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No emails to send',
        processed: 0,
      });
    }

    let sent = 0;
    let failed = 0;

    // Process each scheduled email
    for (const emailLog of scheduledEmails) {
      try {
        if (emailLog.email_type === 'post_booking_followup') {
          const success = await sendPostBookingFollowupEmail(emailLog.reservation_id);
          if (success) {
            sent++;
          } else {
            failed++;
          }
        } else if (emailLog.email_type === 'post_checkin') {
          const success = await sendPostCheckinEmail(emailLog.reservation_id);
          if (success) {
            sent++;
          } else {
            failed++;
          }
        } else if (emailLog.email_type === 'post_checkout') {
          const success = await sendPostCheckoutEmail(emailLog.reservation_id);
          if (success) {
            sent++;
          } else {
            failed++;
          }
        }
      } catch (error: any) {
        log.error('Error processing email for reservation', error, {
          reservationId: emailLog.reservation_id,
        });
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: scheduledEmails.length,
      sent,
      failed,
    });
  } catch (error: any) {
    log.error('Error triggering email sequence', error, {});
    return NextResponse.json(
      { error: error.message || 'Failed to trigger email sequence' },
      { status: 500 }
    );
  }
}

