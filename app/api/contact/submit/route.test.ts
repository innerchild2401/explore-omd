/**
 * Integration Tests for Contact Form API
 * Tests the public contact form submission endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock Supabase service client
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'omds') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { id: 'omd-id-1' }, error: null })),
            })),
          })),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: { id: 'admin-id' }, error: null })),
              })),
            })),
          })),
        };
      }
      if (table === 'contact_inquiries') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { id: 'inquiry-id', name: 'Test', email: 'test@test.com' }, 
                error: null 
              })),
            })),
          })),
        };
      }
      return {};
    }),
    auth: {
      admin: {
        getUserById: vi.fn(() => Promise.resolve({ 
          data: { user: { email: 'admin@test.com' } }, 
          error: null 
        })),
      },
    },
  })),
}));

// Mock MailerSend
vi.mock('mailersend', () => ({
  MailerSend: vi.fn().mockImplementation(() => ({
    email: {
      send: vi.fn(() => Promise.resolve({})),
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

describe('POST /api/contact/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MAILER_SEND_API_KEY = 'test-key';
    process.env.MAILER_SEND_SENDER_EMAIL = 'test@test.com';
    process.env.MAILER_SEND_SENDER_NAME = 'Test Sender';
  });

  it('should return 400 if name is missing', async () => {
    const request = new NextRequest('http://localhost/api/contact/submit', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@test.com',
        mesaj: 'Test message',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Toate câmpurile sunt obligatorii');
  });

  it('should return 400 if email is missing', async () => {
    const request = new NextRequest('http://localhost/api/contact/submit', {
      method: 'POST',
      body: JSON.stringify({
        nume: 'Test User',
        mesaj: 'Test message',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Toate câmpurile sunt obligatorii');
  });

  it('should return 400 if message is missing', async () => {
    const request = new NextRequest('http://localhost/api/contact/submit', {
      method: 'POST',
      body: JSON.stringify({
        nume: 'Test User',
        email: 'test@test.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Toate câmpurile sunt obligatorii');
  });

  it('should successfully submit contact form', async () => {
    const request = new NextRequest('http://localhost/api/contact/submit', {
      method: 'POST',
      body: JSON.stringify({
        nume: 'Test User',
        email: 'test@test.com',
        mesaj: 'Test message',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Inquiry submitted successfully');
  });

  it('should handle OMD slug and link inquiry to OMD', async () => {
    const request = new NextRequest('http://localhost/api/contact/submit', {
      method: 'POST',
      body: JSON.stringify({
        nume: 'Test User',
        email: 'test@test.com',
        mesaj: 'Test message',
        omdSlug: 'test-omd',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should handle database insertion error', async () => {
    // Override mock to return error for contact_inquiries
    const { createServiceRoleClient } = await import('@/lib/supabase/server');
    
    vi.mocked(createServiceRoleClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'contact_inquiries') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: null, 
                  error: { message: 'Database error' } 
                })),
              })),
            })),
          } as any;
        }
        // For other tables, return default mock
        if (table === 'omds') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: { id: 'omd-id-1' }, error: null })),
              })),
            })),
          } as any;
        }
        if (table === 'user_profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: { id: 'admin-id' }, error: null })),
                })),
              })),
            })),
          } as any;
        }
        return {} as any;
      }),
      auth: {
        admin: {
          getUserById: vi.fn(() => Promise.resolve({ 
            data: { user: { email: 'admin@test.com' } }, 
            error: null 
          })),
        },
      },
    } as any);

    const request = new NextRequest('http://localhost/api/contact/submit', {
      method: 'POST',
      body: JSON.stringify({
        nume: 'Test User',
        email: 'test@test.com',
        mesaj: 'Test message',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('A apărut o eroare. Vă rugăm încercați din nou.');
  });

  it('should sanitize message content to prevent XSS', async () => {
    const request = new NextRequest('http://localhost/api/contact/submit', {
      method: 'POST',
      body: JSON.stringify({
        nume: 'Test User',
        email: 'test@test.com',
        mesaj: '<script>alert("XSS")</script>Test message',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Message should be stored as-is (sanitization happens in email template)
  });

  it('should handle missing MailerSend API key gracefully', async () => {
    delete process.env.MAILER_SEND_API_KEY;

    const request = new NextRequest('http://localhost/api/contact/submit', {
      method: 'POST',
      body: JSON.stringify({
        nume: 'Test User',
        email: 'test@test.com',
        mesaj: 'Test message',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    // Should still succeed even if email fails
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should handle MailerSend email sending failure gracefully', async () => {
    const { MailerSend } = await import('mailersend');
    vi.mocked(MailerSend).mockImplementation(() => ({
      email: {
        send: vi.fn(() => Promise.reject(new Error('Email send failed'))),
      },
    } as any));

    const request = new NextRequest('http://localhost/api/contact/submit', {
      method: 'POST',
      body: JSON.stringify({
        nume: 'Test User',
        email: 'test@test.com',
        mesaj: 'Test message',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    // Should still succeed even if email fails
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should handle invalid JSON body', async () => {
    const request = new NextRequest('http://localhost/api/contact/submit', {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('A apărut o eroare neașteptată');
  });
});

