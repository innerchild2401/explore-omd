import { createClient as createServerClient } from '@/lib/supabase/server';
import { decrypt, encrypt } from './encryption';
import { OctorateTokenResponse, OctorateTokenRefreshResponse } from './types';

const OCTORATE_API_BASE_URL = process.env.OCTORATE_API_BASE_URL || 'https://api.octorate.com';
const OCTORATE_BACKOFFICE_URL = process.env.OCTORATE_BACKOFFICE_URL || 'admin.octorate.com';
const OCTORATE_API_VERSION = process.env.OCTORATE_API_VERSION || 'v1';
const OCTORATE_CLIENT_ID = process.env.OCTORATE_CLIENT_ID || '';
const OCTORATE_CLIENT_SECRET = process.env.OCTORATE_CLIENT_SECRET || '';

// Token endpoint format: https://{{enviroment}}/rest/{version}/identity/token
// Used for initial token exchange (authorization code → tokens)
const OCTORATE_ENVIRONMENT = process.env.OCTORATE_ENVIRONMENT || OCTORATE_BACKOFFICE_URL;
const OCTORATE_TOKEN_ENDPOINT = process.env.OCTORATE_TOKEN_ENDPOINT || `https://${OCTORATE_ENVIRONMENT}/rest/${OCTORATE_API_VERSION}/identity/token`;

// Token refresh endpoint: https://{{enviroment}}/rest/{version}/identity/refresh
// Used to refresh access token using refresh_token
const OCTORATE_REFRESH_ENDPOINT = process.env.OCTORATE_REFRESH_ENDPOINT || `https://${OCTORATE_ENVIRONMENT}/rest/${OCTORATE_API_VERSION}/identity/refresh`;

export class OctorateClient {
  private connectionId: string;
  private hotelId: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(connectionId: string, hotelId: string) {
    this.connectionId = connectionId;
    this.hotelId = hotelId;
  }

  // Load tokens from database
  private async loadTokens(): Promise<void> {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('octorate_hotel_connections')
      .select('access_token, refresh_token, token_expires_at')
      .eq('id', this.connectionId)
      .single();

    if (error || !data) {
      throw new Error(`Failed to load tokens: ${error?.message || 'No data'}`);
    }

    this.accessToken = decrypt(data.access_token);
    const refreshTokenValue = decrypt(data.refresh_token);
    this.refreshToken = refreshTokenValue;
    this.tokenExpiresAt = data.token_expires_at ? new Date(data.token_expires_at) : null;
  }

  // Refresh access token if expired
  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken) {
      await this.loadTokens();
    }

    if (!this.tokenExpiresAt || new Date() >= this.tokenExpiresAt) {
      await this.refreshAccessToken();
    }
  }

  // Refresh access token using refresh token
  // Endpoint: /identity/refresh (not /identity/token)
  // Response only includes access_token and expireDate (not refresh_token)
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      await this.loadTokens();
    }

    try {
      // Refresh endpoint: /identity/refresh
      // Note: Documentation doesn't specify request format
      // Using form params (consistent with token exchange endpoint)
      // May need to confirm with Octorate if this is correct
      const response = await fetch(OCTORATE_REFRESH_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: this.refreshToken!,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data: OctorateTokenRefreshResponse = await response.json();
      // Octorate returns expireDate as ISO string, not expires_in as number
      const expiresAt = new Date(data.expireDate);

      // Update only access_token and expireDate (refresh_token stays the same)
      const supabase = await createServerClient();
      const { error } = await supabase
        .from('octorate_hotel_connections')
        .update({
          access_token: encrypt(data.access_token),
          // Note: refresh_token is NOT updated - keep existing one
          token_expires_at: expiresAt.toISOString(),
        })
        .eq('id', this.connectionId);

      if (error) {
        throw new Error(`Failed to save tokens: ${error.message}`);
      }

      this.accessToken = data.access_token;
      this.tokenExpiresAt = expiresAt;
    } catch (error: any) {
      console.error('Token refresh error:', error);
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  // Make authenticated API request
  // IMPORTANT: Always check HTTP response codes first (per Octorate guidelines)
  // Response codes are the definitive status indicator
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    await this.ensureValidToken();

    const url = `${OCTORATE_API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // CRITICAL: Give precedence to HTTP response codes (per Octorate guidelines)
    // Check status code FIRST before parsing response body

    if (response.status === 401) {
      // Token expired, try refreshing once more
      await this.refreshAccessToken();
      return this.request<T>(endpoint, options);
    }

    if (response.status === 429) {
      // Rate limit exceeded
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(`Rate limit exceeded. Retry after: ${retryAfter || 'unknown'} seconds`);
    }

    if (!response.ok) {
      // Get error details from response body if available
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorBody = await response.text();
        if (errorBody) {
          errorMessage = `Octorate API error (${response.status}): ${errorBody}`;
        }
      } catch {
        // If we can't parse error body, use status code and status text
      }
      throw new Error(errorMessage);
    }

    // Only parse response if status is OK (200, 201, etc.)
    return response.json();
  }

  // Rate limit helper (100 calls per 5 minutes per accommodation)
  private static rateLimitMap = new Map<string, { count: number; resetAt: number }>();

  private async checkRateLimit(accommodationId: string): Promise<void> {
    const now = Date.now();
    const limit = OctorateClient.rateLimitMap.get(accommodationId);

    if (!limit || now > limit.resetAt) {
      OctorateClient.rateLimitMap.set(accommodationId, {
        count: 1,
        resetAt: now + 5 * 60 * 1000, // 5 minutes
      });
      return;
    }

    if (limit.count >= 100) {
      const waitTime = Math.ceil((limit.resetAt - now) / 1000);
      throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds.`);
    }

    limit.count++;
  }
}

