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

export interface OctorateTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

