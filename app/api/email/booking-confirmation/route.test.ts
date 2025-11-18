/**
 * Integration Tests for Booking Confirmation Email API
 * Tests the critical booking confirmation email endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { createMockReservation, createMockGuest, createMockRoom, createMockHotel, createMockBusiness, createMockOMD } from '@/__tests__/mocks/factories';

// Mock the Supabase service client
const mockFrom = vi.fn((table: string) => {
  const mockData: Record<string, any> = {
    reservations: createMockReservation(),
    guest_profiles: createMockGuest(),
    rooms: createMockRoom(),
    hotels: createMockHotel(),
    businesses: createMockBusiness(),
    omds: createMockOMD(),
  };

  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ 
          data: mockData[table] || null, 
          error: null 
        })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  };
});

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Mock MailerSend API
global.fetch = vi.fn();

describe('POST /api/email/booking-confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful MailerSend response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ message_id: 'test-message-id' }),
    });
  });

  it('should return 400 if reservationId is missing', async () => {
    const request = new NextRequest('http://localhost/api/email/booking-confirmation', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing reservationId');
  });

  it('should return 404 if reservation not found', async () => {
    // Override mock to return null for reservations table
    mockFrom.mockImplementationOnce((table: string) => {
      if (table === 'reservations') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: null, 
                error: { message: 'Not found', code: 'PGRST116' } 
              })),
            })),
          })),
        } as any;
      }
      // For other tables, return default mock data
      const mockData: Record<string, any> = {
        guest_profiles: createMockGuest(),
        rooms: createMockRoom(),
        hotels: createMockHotel(),
        businesses: createMockBusiness(),
        omds: createMockOMD(),
      };
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: mockData[table] || null, 
              error: null 
            })),
          })),
        })),
      } as any;
    });

    const request = new NextRequest('http://localhost/api/email/booking-confirmation', {
      method: 'POST',
      body: JSON.stringify({ reservationId: 'non-existent-id' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Reservation not found');
  });

  it('should send email successfully with valid reservation', async () => {
    const reservation = createMockReservation();
    const guest = createMockGuest();
    const room = createMockRoom();
    const hotel = createMockHotel();
    const business = createMockBusiness();
    const omd = createMockOMD();

    const request = new NextRequest('http://localhost/api/email/booking-confirmation', {
      method: 'POST',
      body: JSON.stringify({ reservationId: reservation.id }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.mailersend.com/v1/email',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': expect.stringContaining('Bearer'),
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('should return 500 if MailerSend API fails', async () => {
    // Mock MailerSend failure
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'Internal server error' }),
    });

    const request = new NextRequest('http://localhost/api/email/booking-confirmation', {
      method: 'POST',
      body: JSON.stringify({ reservationId: 'test-id' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to send email via MailerSend');
  });

  it('should handle missing environment variables', async () => {
    const originalKey = process.env.MAILER_SEND_API_KEY;
    delete process.env.MAILER_SEND_API_KEY;

    const request = new NextRequest('http://localhost/api/email/booking-confirmation', {
      method: 'POST',
      body: JSON.stringify({ reservationId: 'test-id' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('MAILER_SEND_API_KEY not configured');

    // Restore
    process.env.MAILER_SEND_API_KEY = originalKey;
  });
});

