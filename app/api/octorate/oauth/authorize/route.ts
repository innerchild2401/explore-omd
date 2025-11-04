import { NextRequest, NextResponse } from 'next/server';
import { getOAuthAuthorizationUrl } from '@/lib/services/octorate/auth';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

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

    // Generate state with hotel_id
    const state = Buffer.from(JSON.stringify({ hotelId, userId: user.id })).toString('base64');

    // Store state in cookies for verification
    cookies().set('octorate_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    const authUrl = await getOAuthAuthorizationUrl(state);

    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error('OAuth authorization error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

