import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, saveConnection } from '@/lib/services/octorate/auth';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return redirect('/business/login?error=unauthorized');
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return redirect(`/business/hotel?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return redirect('/business/hotel?error=missing_params');
    }

    // Verify state
    const storedState = cookies().get('octorate_oauth_state')?.value;
    if (!storedState || storedState !== state) {
      return redirect('/business/hotel?error=invalid_state');
    }

    // Parse state
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { hotelId } = stateData;

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get hotel's business_id
    const { data: hotel } = await supabase
      .from('hotels')
      .select('business_id')
      .eq('id', hotelId)
      .single();

    if (!hotel) {
      return redirect('/business/hotel?error=hotel_not_found');
    }

    // Get accommodation ID from user (they need to select it)
    // For now, we'll use a placeholder - UI should handle this
    const accommodationId = searchParams.get('accommodation_id') || '';

    if (!accommodationId) {
      // Redirect to accommodation selection page
      return redirect(`/business/hotel?step=select_accommodation&hotel_id=${hotelId}`);
    }

    // Save connection
    await saveConnection(hotel.business_id, hotelId, tokens, accommodationId);

    // Clear state cookie
    cookies().delete('octorate_oauth_state');

    return redirect(`/business/hotel?success=octorate_connected`);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return redirect(`/business/hotel?error=${encodeURIComponent(error.message)}`);
  }
}

