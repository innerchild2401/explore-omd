import { createClient } from '@/lib/supabase/server';
import { encrypt } from './encryption';
import { OctorateTokenResponse, OctorateApiLoginResponse } from './types';

// Octorate OAuth Configuration
// Based on Octorate documentation: https://{{octorate user backoffice}}/octobook/identity/oauth.xhtml
const OCTORATE_BACKOFFICE_URL = process.env.OCTORATE_BACKOFFICE_URL || 'admin.octorate.com';
const OCTORATE_API_VERSION = process.env.OCTORATE_API_VERSION || 'v1'; // API version - may need confirmation
const OCTORATE_CLIENT_ID = process.env.OCTORATE_CLIENT_ID || '';
const OCTORATE_REDIRECT_URI = process.env.OCTORATE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL}/api/octorate/oauth/callback`;

// Token endpoint format: https://{{enviroment}}/rest/{version}/identity/token
// Note: {{enviroment}} may be the same as backoffice URL - needs confirmation
const OCTORATE_ENVIRONMENT = process.env.OCTORATE_ENVIRONMENT || OCTORATE_BACKOFFICE_URL;
const OCTORATE_TOKEN_ENDPOINT = process.env.OCTORATE_TOKEN_ENDPOINT || `https://${OCTORATE_ENVIRONMENT}/rest/${OCTORATE_API_VERSION}/identity/token`;

export async function getOAuthAuthorizationUrl(state: string): Promise<string> {
  // According to Octorate docs, only these parameters are required:
  // - client_id (mandatory)
  // - redirect_uri (mandatory)
  // - state (optional but recommended for security)
  const params = new URLSearchParams({
    client_id: OCTORATE_CLIENT_ID,
    redirect_uri: OCTORATE_REDIRECT_URI,
    state: state,
  });

  // Authorization URL format: https://{{octorate user backoffice}}/octobook/identity/oauth.xhtml
  return `https://${OCTORATE_BACKOFFICE_URL}/octobook/identity/oauth.xhtml?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<OctorateTokenResponse> {
  const OCTORATE_CLIENT_SECRET = process.env.OCTORATE_CLIENT_SECRET || '';

  // Server-to-server call to exchange authorization code for tokens
  // IMPORTANT: Must be done within 1 minute after redirect
  // Endpoint format: https://{{enviroment}}/rest/{version}/identity/token
  // Using Content-Type: application/x-www-form-urlencoded with form params
  
  const response = await fetch(OCTORATE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'code', // Octorate uses 'code' not 'authorization_code'
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
  
  // Octorate returns expireDate as ISO string, not expires_in as number
  // Convert expireDate to Date object
  const expiresAt = new Date(tokens.expireDate);

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

/**
 * Admin Operations Flow - ApiLogin method
 * Server-to-server authentication for admin operations (creating properties, etc.)
 * This does NOT require user OAuth - uses client_id and client_secret directly
 * 
 * Note: As an OTA, we typically only pull data from Octorate, not create properties.
 * This method may be needed if we need to perform admin operations on Octorate's side.
 * 
 * @returns Admin access token for performing administrative operations
 */
export async function apiLogin(): Promise<OctorateApiLoginResponse> {
  const OCTORATE_CLIENT_SECRET = process.env.OCTORATE_CLIENT_SECRET || '';
  const OCTORATE_API_VERSION = process.env.OCTORATE_API_VERSION || 'v1';
  const OCTORATE_ENVIRONMENT = process.env.OCTORATE_ENVIRONMENT || process.env.OCTORATE_BACKOFFICE_URL || 'admin.octorate.com';
  
  // ApiLogin endpoint: /identity/apilogin
  const apiLoginEndpoint = process.env.OCTORATE_API_LOGIN_ENDPOINT 
    || `https://${OCTORATE_ENVIRONMENT}/rest/${OCTORATE_API_VERSION}/identity/apilogin`;

  const response = await fetch(apiLoginEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: OCTORATE_CLIENT_ID,
      client_secret: OCTORATE_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ApiLogin failed: ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

