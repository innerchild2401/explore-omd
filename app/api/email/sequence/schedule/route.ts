import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scheduleEmailSequence } from '@/lib/services/email-sequence/schedule';

/**
 * Schedule email sequence for a reservation
 * POST /api/email/sequence/schedule
 * Body: { reservationId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { reservationId } = await request.json();

    if (!reservationId) {
      return NextResponse.json(
        { error: 'reservationId is required' },
        { status: 400 }
      );
    }

    await scheduleEmailSequence(reservationId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error scheduling email sequence:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to schedule email sequence' },
      { status: 500 }
    );
  }
}

