/**
 * Supabase Mock Utilities
 * Provides mock Supabase client for testing
 */

import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a mock Supabase client
 */
export function createMockSupabaseClient(): Partial<SupabaseClient> {
  const mockData: Record<string, any> = {};
  const mockError: Record<string, any> = {};

  return {
    from: vi.fn((table: string) => ({
      select: vi.fn((columns = '*') => ({
        eq: vi.fn((column: string, value: any) => ({
          neq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockData[table], error: mockError[table] })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: mockData[table] || null, error: null })),
            limit: vi.fn(() => Promise.resolve({ data: mockData[table] || [], error: null })),
          })),
          single: vi.fn(() => Promise.resolve({ data: mockData[table], error: mockError[table] })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: mockData[table] || null, error: null })),
          limit: vi.fn(() => Promise.resolve({ data: mockData[table] || [], error: null })),
        })),
        single: vi.fn(() => Promise.resolve({ data: mockData[table], error: mockError[table] })),
        maybeSingle: vi.fn(() => Promise.resolve({ data: mockData[table] || null, error: null })),
        limit: vi.fn(() => Promise.resolve({ data: mockData[table] || [], error: null })),
        order: vi.fn(() => Promise.resolve({ data: mockData[table] || [], error: null })),
      })),
      insert: vi.fn((data: any) => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'mock-id', ...data }, error: null })),
        })),
      })),
      update: vi.fn((data: any) => ({
        eq: vi.fn(() => Promise.resolve({ data: mockData[table], error: null })),
        select: vi.fn(() => Promise.resolve({ data: mockData[table], error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: null },
          error: null,
        })
      ),
      getSession: vi.fn(() =>
        Promise.resolve({
          data: { session: null },
          error: null,
        })
      ),
    },
  } as any;
}

/**
 * Sets mock data for a table
 */
export function setMockData(table: string, data: any) {
  // This would be used with a more sophisticated mock
  return data;
}

/**
 * Sets mock error for a table
 */
export function setMockError(table: string, error: any) {
  // This would be used with a more sophisticated mock
  return error;
}

