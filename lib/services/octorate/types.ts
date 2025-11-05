// Octorate API Types
export interface OctorateAccommodation {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface OctorateRoomType {
  id: string;
  accommodationId: string;
  name: string;
  maxOccupancy: number;
  basePrice?: number;
}

export interface OctorateAvailability {
  roomTypeId: string;
  date: string;
  available: boolean;
  quantity?: number;
}

export interface OctorateRate {
  roomTypeId: string;
  date: string;
  price: number;
  currency?: string;
}

export interface OctorateBookingRequest {
  accommodationId: string;
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
  guests: {
    adults: number;
    children?: number;
    infants?: number;
  };
  guestInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  specialRequests?: string;
}

export interface OctorateBookingResponse {
  bookingId: string;
  confirmationNumber: string;
  status: 'confirmed' | 'pending' | 'tentative';
}

export interface OctorateWebhookEvent {
  eventType: string;
  accommodationId: string;
  payload: Record<string, any>;
  timestamp: string;
}

export interface OctorateConnection {
  id: string;
  businessId: string;
  hotelId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date | null;
  octorateAccommodationId: string;
  isActive: boolean;
  isConnected: boolean;
  lastSyncAt: Date | null;
}

// Octorate Token Response - matches their actual API response for token exchange
export interface OctorateTokenResponse {
  access_token: string;
  refresh_token: string; // Only included in initial token exchange, not in refresh
  expireDate: string; // ISO date string (e.g., "2020-03-17T17:41:51.178Z")
  // Note: Octorate uses expireDate (ISO string) instead of expires_in (number in seconds)
}

// Octorate Token Refresh Response - only includes access_token and expireDate
export interface OctorateTokenRefreshResponse {
  access_token: string;
  expireDate: string; // ISO date string (e.g., "2020-03-17T17:41:51.178Z")
  // Note: refresh_token is NOT included in refresh response - keep using existing refresh_token
}

// Octorate Admin ApiLogin Response - server-to-server authentication for admin operations
// Used for creating properties, admin operations that don't require user OAuth
export interface OctorateApiLoginResponse {
  access_token: string;
  expireDate: string; // ISO date string (e.g., "2020-03-17T17:41:51.178Z")
  // Note: No refresh_token - this is a temporary admin token
}

