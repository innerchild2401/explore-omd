/**
 * Integration Tests for Send Approval Email API
 * Tests business approval email sending
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

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
    setReplyTo: vi.fn().mockReturnThis(),
    setSubject: vi.fn().mockReturnThis(),
    setHtml: vi.fn().mockReturnThis(),
    setText: vi.fn().mockReturnThis(),
  })),
  Sender: vi.fn(),
  Recipient: vi.fn(),
}));

describe('POST /api/email/send-approval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MAILER_SEND_API_KEY = 'test-key';
    process.env.MAILER_SEND_FROM_EMAIL = 'test@test.com';
    process.env.MAILER_SEND_TRIAL_MODE = 'false';
    mockSend.mockResolvedValue({});
  });

  it('should return 400 if recipientName is missing', async () => {
    const request = new NextRequest('http://localhost/api/email/send-approval', {
      method: 'POST',
      body: JSON.stringify({
        businessName: 'Test Business',
        businessType: 'hotel',
        recipientEmail: 'test@test.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
  });

  it('should return 400 if businessName is missing', async () => {
    const request = new NextRequest('http://localhost/api/email/send-approval', {
      method: 'POST',
      body: JSON.stringify({
        recipientName: 'Test User',
        businessType: 'hotel',
        recipientEmail: 'test@test.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
  });

  it('should return 400 if businessType is missing', async () => {
    const request = new NextRequest('http://localhost/api/email/send-approval', {
      method: 'POST',
      body: JSON.stringify({
        recipientName: 'Test User',
        businessName: 'Test Business',
        recipientEmail: 'test@test.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
  });

  it('should return 400 if recipientEmail is missing', async () => {
    const request = new NextRequest('http://localhost/api/email/send-approval', {
      method: 'POST',
      body: JSON.stringify({
        recipientName: 'Test User',
        businessName: 'Test Business',
        businessType: 'hotel',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
  });

  it('should return 500 if MAILER_SEND_API_KEY is not configured', async () => {
    const originalKey = process.env.MAILER_SEND_API_KEY;
    delete process.env.MAILER_SEND_API_KEY;

    const request = new NextRequest('http://localhost/api/email/send-approval', {
      method: 'POST',
      body: JSON.stringify({
        recipientName: 'Test User',
        businessName: 'Test Business',
        businessType: 'hotel',
        recipientEmail: 'test@test.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    // The error is thrown and caught, so it becomes "Failed to send email"
    expect(data.error).toBe('Failed to send email');
    
    // Restore
    if (originalKey) process.env.MAILER_SEND_API_KEY = originalKey;
  });

  it('should successfully send approval email for hotel', async () => {
    const request = new NextRequest('http://localhost/api/email/send-approval', {
      method: 'POST',
      body: JSON.stringify({
        recipientName: 'Test User',
        businessName: 'Test Hotel',
        businessType: 'hotel',
        recipientEmail: 'test@test.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSend).toHaveBeenCalled();
  });

  it('should successfully send approval email for restaurant', async () => {
    const request = new NextRequest('http://localhost/api/email/send-approval', {
      method: 'POST',
      body: JSON.stringify({
        recipientName: 'Test User',
        businessName: 'Test Restaurant',
        businessType: 'restaurant',
        recipientEmail: 'test@test.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should successfully send approval email for experience', async () => {
    const request = new NextRequest('http://localhost/api/email/send-approval', {
      method: 'POST',
      body: JSON.stringify({
        recipientName: 'Test User',
        businessName: 'Test Experience',
        businessType: 'experience',
        recipientEmail: 'test@test.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should handle trial mode and redirect email', async () => {
    process.env.MAILER_SEND_TRIAL_MODE = 'true';
    process.env.MAILER_SEND_TRIAL_EMAIL = 'trial@test.com';

    const request = new NextRequest('http://localhost/api/email/send-approval', {
      method: 'POST',
      body: JSON.stringify({
        recipientName: 'Test User',
        businessName: 'Test Business',
        businessType: 'hotel',
        recipientEmail: 'original@test.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.trialMode).toBe(true);
    expect(data.message).toContain('trial mode');
  });

  it('should handle MailerSend API error', async () => {
    mockSend.mockRejectedValue(new Error('MailerSend API error'));

    const request = new NextRequest('http://localhost/api/email/send-approval', {
      method: 'POST',
      body: JSON.stringify({
        recipientName: 'Test User',
        businessName: 'Test Business',
        businessType: 'hotel',
        recipientEmail: 'test@test.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to send email');
  });

  it('should handle invalid JSON body', async () => {
    const request = new NextRequest('http://localhost/api/email/send-approval', {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to send email');
  });
});

