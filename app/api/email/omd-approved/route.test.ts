/**
 * Integration Tests for OMD Approved Email API
 * Tests OMD approval email sending to admins
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock Supabase service client
const mockFrom = vi.fn();
const mockGetUserById = vi.fn();

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
    auth: {
      admin: {
        getUserById: mockGetUserById,
      },
    },
  })),
}));

// Mock MailerSend
const mockSend = vi.fn();
vi.mock('mailersend', () => ({
  MailerSend: vi.fn().mockImplementation(() => ({
    email: {
      send: mockSend,
    },
  })),
  EmailParams: vi.fn().mockImplementation(() => ({
    setFrom: vi.fn().mockReturnThis(),
    setTo: vi.fn().mockReturnThis(),
    setSubject: vi.fn().mockReturnThis(),
    setHtml: vi.fn().mockReturnThis(),
    setText: vi.fn().mockReturnThis(),
  })),
  Sender: vi.fn(),
  Recipient: vi.fn(),
}));

describe('POST /api/email/omd-approved', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MAILER_SEND_API_KEY = 'test-key';
    process.env.MAILER_SEND_SENDER_EMAIL = 'test@test.com';
    process.env.MAILER_SEND_SENDER_NAME = 'Test Sender';
    process.env.MAILER_SEND_TRIAL_MODE = 'false';
    mockSend.mockResolvedValue({});
  });

  it('should return 400 if omdId is missing', async () => {
    const request = new NextRequest('http://localhost/api/email/omd-approved', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('omdId is required');
  });

  it('should return 404 if OMD not found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: null, 
            error: { message: 'Not found' } 
          })),
        })),
      })),
    });

    const request = new NextRequest('http://localhost/api/email/omd-approved', {
      method: 'POST',
      body: JSON.stringify({ omdId: 'non-existent-omd' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('OMD not found');
  });

  it('should return 404 if no OMD admin found', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'omds') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { id: 'omd-id-1', name: 'Test OMD', slug: 'test-omd', status: 'active' }, 
                error: null 
              })),
            })),
          })),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ 
                data: [], 
                error: null 
              })),
            })),
          })),
        };
      }
      return {};
    });

    const request = new NextRequest('http://localhost/api/email/omd-approved', {
      method: 'POST',
      body: JSON.stringify({ omdId: 'omd-id-1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('No OMD admin found for destination');
  });

  it('should return 500 if MAILER_SEND_API_KEY is not configured', async () => {
    delete process.env.MAILER_SEND_API_KEY;

    mockFrom.mockImplementation((table: string) => {
      if (table === 'omds') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { id: 'omd-id-1', name: 'Test OMD', slug: 'test-omd', status: 'active' }, 
                error: null 
              })),
            })),
          })),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ 
                data: [{ id: 'admin-id-1', profile: { name: 'Admin' } }], 
                error: null 
              })),
            })),
          })),
        };
      }
      return {};
    });

    mockGetUserById.mockResolvedValue({
      data: { user: { email: 'admin@test.com' } },
      error: null,
    });

    const request = new NextRequest('http://localhost/api/email/omd-approved', {
      method: 'POST',
      body: JSON.stringify({ omdId: 'omd-id-1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('MailerSend API key not configured');
  });

  it('should successfully send OMD approval email', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'omds') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { id: 'omd-id-1', name: 'Test OMD', slug: 'test-omd', status: 'active' }, 
                error: null 
              })),
            })),
          })),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ 
                data: [{ id: 'admin-id-1', profile: { name: 'Admin' } }], 
                error: null 
              })),
            })),
          })),
        };
      }
      return {};
    });

    mockGetUserById.mockResolvedValue({
      data: { user: { email: 'admin@test.com' } },
      error: null,
    });

    const request = new NextRequest('http://localhost/api/email/omd-approved', {
      method: 'POST',
      body: JSON.stringify({ omdId: 'omd-id-1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSend).toHaveBeenCalled();
  });

  it('should handle trial mode and redirect email', async () => {
    process.env.MAILER_SEND_TRIAL_MODE = 'true';
    process.env.MAILER_SEND_TRIAL_EMAIL = 'trial@test.com';

    mockFrom.mockImplementation((table: string) => {
      if (table === 'omds') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { id: 'omd-id-1', name: 'Test OMD', slug: 'test-omd', status: 'active' }, 
                error: null 
              })),
            })),
          })),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ 
                data: [{ id: 'admin-id-1', profile: { name: 'Admin' } }], 
                error: null 
              })),
            })),
          })),
        };
      }
      return {};
    });

    mockGetUserById.mockResolvedValue({
      data: { user: { email: 'admin@test.com' } },
      error: null,
    });

    const request = new NextRequest('http://localhost/api/email/omd-approved', {
      method: 'POST',
      body: JSON.stringify({ omdId: 'omd-id-1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.trialMode).toBe(true);
  });

  it('should return 400 if no valid recipient email found', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'omds') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { id: 'omd-id-1', name: 'Test OMD', slug: 'test-omd', status: 'active' }, 
                error: null 
              })),
            })),
          })),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ 
                data: [{ id: 'admin-id-1', profile: { name: 'Admin' } }], 
                error: null 
              })),
            })),
          })),
        };
      }
      return {};
    });

    mockGetUserById.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = new NextRequest('http://localhost/api/email/omd-approved', {
      method: 'POST',
      body: JSON.stringify({ omdId: 'omd-id-1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No valid recipient email found');
  });

  it('should handle MailerSend API error', async () => {
    mockSend.mockRejectedValue(new Error('MailerSend API error'));

    mockFrom.mockImplementation((table: string) => {
      if (table === 'omds') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { id: 'omd-id-1', name: 'Test OMD', slug: 'test-omd', status: 'active' }, 
                error: null 
              })),
            })),
          })),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ 
                data: [{ id: 'admin-id-1', profile: { name: 'Admin' } }], 
                error: null 
              })),
            })),
          })),
        };
      }
      return {};
    });

    mockGetUserById.mockResolvedValue({
      data: { user: { email: 'admin@test.com' } },
      error: null,
    });

    const request = new NextRequest('http://localhost/api/email/omd-approved', {
      method: 'POST',
      body: JSON.stringify({ omdId: 'omd-id-1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to send OMD approval email');
  });
});

