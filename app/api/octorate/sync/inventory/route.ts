import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pullRoomTypes } from '@/lib/services/octorate/rooms';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { hotelId } = await request.json();

    if (!hotelId) {
      return NextResponse.json({ error: 'hotel_id is required' }, { status: 400 });
    }

    // Get connection
    const { data: connection } = await supabase
      .from('octorate_hotel_connections')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('is_active', true)
      .eq('is_connected', true)
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'Octorate connection not found' }, { status: 404 });
    }

    // Pull room types
    await pullRoomTypes(connection.id, hotelId, connection.octorate_accommodation_id);

    // Update last inventory sync time
    await supabase
      .from('octorate_hotel_connections')
      .update({ last_inventory_sync_at: new Date().toISOString() })
      .eq('id', connection.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Inventory sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

