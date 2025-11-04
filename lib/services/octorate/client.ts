import { createClient as createServerClient } from '@/lib/supabase/server';
import { decrypt, encrypt } from './encryption';
import { OctorateTokenResponse } from './types';

const OCTORATE_API_BASE_URL = process.env.OCTORATE_API_BASE_URL || 'https://api.octorate.com';
const OCTORATE_CLIENT_ID = process.env.OCTORATE_CLIENT_ID || '';
const OCTORATE_CLIENT_SECRET = process.env.OCTORATE_CLIENT_SECRET || '';

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
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      await this.loadTokens();
    }

    try {
      const response = await fetch(`${OCTORATE_API_BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken!,
          client_id: OCTORATE_CLIENT_ID,
          client_secret: OCTORATE_CLIENT_SECRET,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data: OctorateTokenResponse = await response.json();
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);

      // Update tokens in database
      const supabase = await createServerClient();
      const { error } = await supabase
        .from('octorate_hotel_connections')
        .update({
          access_token: encrypt(data.access_token),
          refresh_token: encrypt(data.refresh_token),
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

    if (response.status === 401) {
      // Token expired, try refreshing once more
      await this.refreshAccessToken();
      return this.request<T>(endpoint, options);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Octorate API error (${response.status}): ${errorText}`);
    }

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

