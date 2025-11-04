import { NextRequest, NextResponse } from 'next/server';
import { processWebhook } from '@/lib/services/octorate/webhooks';
import { createClient } from '@/lib/supabase/server';

const WEBHOOK_SECRET = process.env.OCTORATE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (if provided by Octorate)
    const signature = request.headers.get('x-octorate-signature');
    if (WEBHOOK_SECRET && signature) {
      // Implement signature verification
      // const isValid = verifySignature(request.body, signature, WEBHOOK_SECRET);
      // if (!isValid) {
      //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      // }
    }

    const body = await request.json();
    const { eventType, accommodationId, payload } = body;

    // Get connection by accommodation ID
    const supabase = await createClient();
    const { data: connection } = await supabase
      .from('octorate_hotel_connections')
      .select('id')
      .eq('octorate_accommodation_id', accommodationId)
      .eq('is_active', true)
      .eq('is_connected', true)
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Process webhook
    await processWebhook(connection.id, {
      eventType,
      accommodationId,
      payload,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

