import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { disconnectConnection } from '@/lib/services/octorate/auth';

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

    // Disconnect
    await disconnectConnection(hotelId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Disconnect error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

