import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const hotelId = searchParams.get('hotel_id');

    if (!hotelId) {
      return NextResponse.json({ error: 'hotel_id is required' }, { status: 400 });
    }

    // Get connection status
    const { data: connection } = await supabase
      .from('octorate_hotel_connections')
      .select('*')
      .eq('hotel_id', hotelId)
      .single();

    if (!connection) {
      return NextResponse.json({ connected: false });
    }

    // Get sync queue status
    const { data: queue } = await supabase
      .from('octorate_sync_queue')
      .select('status, sync_type')
      .eq('octorate_connection_id', connection.id)
      .in('status', ['pending', 'processing']);

    // Get recent webhook events
    const { data: webhooks } = await supabase
      .from('octorate_webhook_events')
      .select('event_type, processed, created_at')
      .eq('octorate_connection_id', connection.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      connected: connection.is_connected,
      isActive: connection.is_active,
      lastSyncAt: connection.last_sync_at,
      lastInventorySyncAt: connection.last_inventory_sync_at,
      errorCount: connection.error_count,
      lastError: connection.last_error,
      queueStatus: {
        pending: queue?.filter(q => q.status === 'pending').length || 0,
        processing: queue?.filter(q => q.status === 'processing').length || 0,
      },
      recentWebhooks: webhooks || [],
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

