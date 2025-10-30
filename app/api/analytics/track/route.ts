import { NextRequest, NextResponse } from 'next/server';
import { trackEvent } from '@/lib/analytics/track';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, eventType, metadata } = body;

    // Validate inputs
    if (!businessId || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId and eventType' },
        { status: 400 }
      );
    }

    // Validate event type
    const validEventTypes = [
      'page_view',
      'detail_view',
      'gallery_view',
      'contact_click',
      'menu_view',
      'menu_item_view',
      'room_view',
      'availability_check',
      'time_slot_view',
      'booking_initiated',
      'booking_completed',
      'booking_cancelled',
    ];

    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      );
    }

    // Track the event
    const result = await trackEvent(
      {
        businessId,
        eventType,
        metadata,
      },
      request
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to track event', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in analytics track endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

