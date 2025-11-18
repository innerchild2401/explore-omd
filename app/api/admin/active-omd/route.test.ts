/**
 * Integration Tests for Admin Active OMD API
 * Tests authentication and authorization for admin endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from './route';
import { NextRequest } from 'next/server';

// Mock Supabase client
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

describe('POST /api/admin/active-omd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if omdId is missing', async () => {
    const request = new NextRequest('http://localhost/api/admin/active-omd', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid OMD id');
  });

  it('should return 400 if omdId is empty string', async () => {
    const request = new NextRequest('http://localhost/api/admin/active-omd', {
      method: 'POST',
      body: JSON.stringify({ omdId: '' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid OMD id');
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const request = new NextRequest('http://localhost/api/admin/active-omd', {
      method: 'POST',
      body: JSON.stringify({ omdId: 'omd-id-1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 if user is not super_admin', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-id-1' } },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { role: 'omd_admin' }, 
            error: null 
          })),
        })),
      })),
    });

    const request = new NextRequest('http://localhost/api/admin/active-omd', {
      method: 'POST',
      body: JSON.stringify({ omdId: 'omd-id-1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('should return 404 if OMD not found', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-id-1' } },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { role: 'super_admin' }, 
                error: null 
              })),
            })),
          })),
        };
      }
      if (table === 'omds') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: null, 
                error: { message: 'Not found' } 
              })),
            })),
          })),
        };
      }
      return {};
    });

    const request = new NextRequest('http://localhost/api/admin/active-omd', {
      method: 'POST',
      body: JSON.stringify({ omdId: 'non-existent-omd' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('OMD not found');
  });

  it('should successfully set active OMD for super_admin', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-id-1' } },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { role: 'super_admin' }, 
                error: null 
              })),
            })),
          })),
        };
      }
      if (table === 'omds') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { id: 'omd-id-1' }, 
                error: null 
              })),
            })),
          })),
        };
      }
      return {};
    });

    const request = new NextRequest('http://localhost/api/admin/active-omd', {
      method: 'POST',
      body: JSON.stringify({ omdId: 'omd-id-1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    
    // Check that cookie was set
    const cookies = response.headers.get('set-cookie');
    expect(cookies).toContain('admin-active-omd=omd-id-1');
  });

  it('should handle invalid JSON body', async () => {
    const request = new NextRequest('http://localhost/api/admin/active-omd', {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('DELETE /api/admin/active-omd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const request = new NextRequest('http://localhost/api/admin/active-omd', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 if user is not super_admin', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-id-1' } },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { role: 'omd_admin' }, 
            error: null 
          })),
        })),
      })),
    });

    const request = new NextRequest('http://localhost/api/admin/active-omd', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('should successfully clear active OMD for super_admin', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-id-1' } },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { role: 'super_admin' }, 
            error: null 
          })),
        })),
      })),
    });

    const request = new NextRequest('http://localhost/api/admin/active-omd', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    
    // Check that cookie was cleared
    const cookies = response.headers.get('set-cookie');
    expect(cookies).toContain('admin-active-omd=');
    expect(cookies).toContain('Max-Age=0');
  });
});

