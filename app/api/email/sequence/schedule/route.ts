import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scheduleEmailSequence } from '@/lib/services/email-sequence/schedule';
import logger from '@/lib/logger';
import { rateLimitCheck } from '@/lib/middleware/rate-limit';
import { validateRequest } from '@/lib/validation/validate';
import { emailSequenceScheduleSchema } from '@/lib/validation/schemas';

/**
 * Schedule email sequence for a reservation
 * POST /api/email/sequence/schedule
 * Body: { reservationId: string }
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await rateLimitCheck(request, 'email');
  if (!rateLimit.success) {
    return rateLimit.response!;
  }
  try {
    // Validate request body
    const validation = await validateRequest(request, emailSequenceScheduleSchema);
    if (!validation.success) {
      return validation.response;
    }
    const { reservationId } = validation.data;

    await scheduleEmailSequence(reservationId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Error scheduling email sequence', error, {
      reservationId,
    });
    return NextResponse.json(
      { error: error.message || 'Failed to schedule email sequence' },
      { status: 500 }
    );
  }
}

