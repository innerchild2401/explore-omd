import { createClient } from '@/lib/supabase/server';
import { encrypt } from './encryption';
import { OctorateTokenResponse } from './types';

const OCTORATE_OAUTH_URL = process.env.OCTORATE_OAUTH_URL || 'https://api.octorate.com/oauth';
const OCTORATE_CLIENT_ID = process.env.OCTORATE_CLIENT_ID || '';
const OCTORATE_REDIRECT_URI = process.env.OCTORATE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL}/api/octorate/oauth/callback`;

export async function getOAuthAuthorizationUrl(state: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: OCTORATE_CLIENT_ID,
    redirect_uri: OCTORATE_REDIRECT_URI,
    response_type: 'code',
    scope: 'read_accommodations read_rooms read_availability read_rates write_bookings',
    state: state,
  });

  return `${OCTORATE_OAUTH_URL}/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<OctorateTokenResponse> {
  const OCTORATE_CLIENT_SECRET = process.env.OCTORATE_CLIENT_SECRET || '';

  const response = await fetch(`${OCTORATE_OAUTH_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: OCTORATE_REDIRECT_URI,
      client_id: OCTORATE_CLIENT_ID,
      client_secret: OCTORATE_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

export async function saveConnection(
  businessId: string,
  hotelId: string,
  tokens: OctorateTokenResponse,
  accommodationId: string
): Promise<string> {
  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  const { data, error } = await supabase
    .from('octorate_hotel_connections')
    .insert({
      business_id: businessId,
      hotel_id: hotelId,
      access_token: encrypt(tokens.access_token),
      refresh_token: encrypt(tokens.refresh_token),
      token_expires_at: expiresAt.toISOString(),
      octorate_accommodation_id: accommodationId,
      is_active: true,
      is_connected: true,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to save connection: ${error.message}`);
  }

  // Update hotel to use Octorate
  await supabase
    .from('hotels')
    .update({
      pms_type: 'octorate',
      octorate_connection_id: data.id,
    })
    .eq('id', hotelId);

  return data.id;
}

export async function getConnection(hotelId: string): Promise<any | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('octorate_hotel_connections')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('is_active', true)
    .eq('is_connected', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function disconnectConnection(hotelId: string): Promise<void> {
  const supabase = await createClient();

  // Update connection status
  await supabase
    .from('octorate_hotel_connections')
    .update({
      is_active: false,
      is_connected: false,
    })
    .eq('hotel_id', hotelId);

  // Update hotel to use internal PMS
  await supabase
    .from('hotels')
    .update({
      pms_type: 'internal',
      octorate_connection_id: null,
    })
    .eq('id', hotelId);
}

