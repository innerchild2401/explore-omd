import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pullAvailability } from '@/lib/services/octorate/availability';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { hotelId, startDate, endDate } = await request.json();

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

    // Default to 30 days if not provided
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Pull availability
    await pullAvailability(connection.id, hotelId, connection.octorate_accommodation_id, start, end);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Availability sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

