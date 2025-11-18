/**
 * Unit Tests for lib/supabase/queries.ts
 * Tests all database query functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getOMDBySlug,
  getAllOMDs,
  getSectionsByOMD,
  getSectionByType,
  getBusinessesByOMD,
  getBusinessBySlug,
  getTranslation,
  getRoomsByHotel,
  getMenuItemsByRestaurant,
  getExperienceAvailability,
  getReviewsByBusiness,
} from './queries';
import { createMockOMD, createMockBusiness } from '@/__tests__/mocks/factories';

// Mock the server client
vi.mock('./server', () => ({
  createClient: vi.fn(),
}));

describe('lib/supabase/queries', () => {
  let mockSupabase: Partial<SupabaseClient>;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create a mock Supabase client
    mockSupabase = {
      from: vi.fn((table: string) => ({
        select: vi.fn((columns = '*') => ({
          eq: vi.fn((column: string, value: any) => ({
            eq: vi.fn((column2: string, value2: any) => ({
              eq: vi.fn((column3: string, value3: any) => ({
                single: vi.fn(() => Promise.resolve({ data: null, error: null })),
                maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
                limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
              limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  order: vi.fn(() => Promise.resolve({ data: [], error: null })),
                })),
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    } as any;

    // Import and mock createClient
    const createClientModule = await import('./server');
    vi.mocked(createClientModule.createClient).mockResolvedValue(mockSupabase as any);
  });

  describe('getOMDBySlug', () => {
    it('should return OMD when found', async () => {
      const mockOMD = createMockOMD({ slug: 'test-omd' });
      
      const mockFromFn = vi.fn((table: string) => {
        if (table === 'omds') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() => Promise.resolve({ data: mockOMD, error: null })),
                })),
                maybeSingle: vi.fn(() => Promise.resolve({ data: mockOMD, error: null })),
              })),
            })),
          };
        }
        return mockSupabase.from!(table);
      });
      
      mockSupabase.from = mockFromFn;

      const result = await getOMDBySlug('test-omd');
      expect(result).toEqual(mockOMD);
    });

    it('should return null when OMD not found', async () => {
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      } as any);

      const result = await getOMDBySlug('non-existent');
      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Error' } })),
            })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Error' } })),
          })),
        })),
      } as any);

      const result = await getOMDBySlug('test-omd');
      expect(result).toBeNull();
    });

    it('should include inactive OMDs when includeInactive is true', async () => {
      const mockOMD = createMockOMD({ slug: 'test-omd', status: 'pending' });
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: mockOMD, error: null })),
          })),
        })),
      } as any);

      const result = await getOMDBySlug('test-omd', undefined, true);
      expect(result).toEqual(mockOMD);
    });

    it('should use provided supabase client', async () => {
      const customClient = mockSupabase as SupabaseClient;
      const mockOMD = createMockOMD();
      
      vi.mocked(customClient.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: mockOMD, error: null })),
            })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: mockOMD, error: null })),
          })),
        })),
      } as any);

      await getOMDBySlug('test', customClient);
      expect(customClient.from).toHaveBeenCalled();
    });
  });

  describe('getAllOMDs', () => {
    it('should return array of OMDs', async () => {
      const mockOMDs = [createMockOMD(), createMockOMD()];
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockOMDs, error: null })),
          })),
          order: vi.fn(() => Promise.resolve({ data: mockOMDs, error: null })),
        })),
      } as any);

      const result = await getAllOMDs();
      expect(result).toEqual(mockOMDs);
    });

    it('should return empty array on error', async () => {
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Error' } })),
          })),
          order: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Error' } })),
        })),
      } as any);

      const result = await getAllOMDs();
      expect(result).toEqual([]);
    });

    it('should include inactive OMDs when includeInactive is true', async () => {
      const mockOMDs = [createMockOMD({ status: 'pending' })];
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: mockOMDs, error: null })),
        })),
      } as any);

      const result = await getAllOMDs(undefined, true);
      expect(result).toEqual(mockOMDs);
    });
  });

  describe('getSectionsByOMD', () => {
    it('should return sections for OMD', async () => {
      const mockSections = [
        { id: '1', omd_id: 'omd-1', type: 'hero', is_visible: true, order_index: 1 },
        { id: '2', omd_id: 'omd-1', type: 'search', is_visible: true, order_index: 2 },
      ];
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockSections, error: null })),
            })),
            order: vi.fn(() => Promise.resolve({ data: mockSections, error: null })),
          })),
        })),
      } as any);

      const result = await getSectionsByOMD('omd-1');
      expect(result).toEqual(mockSections);
    });

    it('should include hidden sections when includeHidden is true', async () => {
      const mockSections = [
        { id: '1', omd_id: 'omd-1', is_visible: false },
      ];
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockSections, error: null })),
          })),
        })),
      } as any);

      const result = await getSectionsByOMD('omd-1', true);
      expect(result).toEqual(mockSections);
    });

    it('should return empty array on error', async () => {
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Error' } })),
            })),
            order: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Error' } })),
          })),
        })),
      } as any);

      const result = await getSectionsByOMD('omd-1');
      expect(result).toEqual([]);
    });
  });

  describe('getSectionByType', () => {
    it('should return section when found', async () => {
      const mockSection = { id: '1', omd_id: 'omd-1', type: 'hero', is_visible: true };
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockSection, error: null })),
              })),
            })),
          })),
        })),
      } as any);

      const result = await getSectionByType('omd-1', 'hero');
      expect(result).toEqual(mockSection);
    });

    it('should return null when section not found', async () => {
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Not found' } })),
              })),
            })),
          })),
        })),
      } as any);

      const result = await getSectionByType('omd-1', 'hero');
      expect(result).toBeNull();
    });
  });

  describe('getBusinessesByOMD', () => {
    it('should return businesses for OMD', async () => {
      const mockBusinesses = [
        createMockBusiness({ omd_id: 'omd-1', featured_order: 1 }),
        createMockBusiness({ omd_id: 'omd-1', featured_order: 2 }),
      ];
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: mockBusinesses, error: null })),
            })),
            eq: vi.fn(() => Promise.resolve({ data: mockBusinesses, error: null })),
          })),
        })),
      } as any);

      const result = await getBusinessesByOMD('omd-1');
      expect(result).toHaveLength(2);
    });

    it('should filter by business type', async () => {
      const mockBusinesses = [createMockBusiness({ type: 'hotel' })];
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: mockBusinesses, error: null })),
              })),
              eq: vi.fn(() => Promise.resolve({ data: mockBusinesses, error: null })),
            })),
          })),
        })),
      } as any);

      const result = await getBusinessesByOMD('omd-1', 'hotel');
      expect(result).toHaveLength(1);
    });

    it('should apply limit', async () => {
      const mockBusinesses = Array(10).fill(null).map(() => createMockBusiness());
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: mockBusinesses, error: null })),
            })),
            eq: vi.fn(() => Promise.resolve({ data: mockBusinesses, error: null })),
          })),
        })),
      } as any);

      const result = await getBusinessesByOMD('omd-1', undefined, 5);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array on error', async () => {
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Error' } })),
            })),
            eq: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Error' } })),
          })),
        })),
      } as any);

      const result = await getBusinessesByOMD('omd-1');
      expect(result).toEqual([]);
    });
  });

  describe('getBusinessBySlug', () => {
    it('should return business when found', async () => {
      const mockBusiness = createMockBusiness({ slug: 'test-business' });
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: mockBusiness, error: null })),
                })),
                single: vi.fn(() => Promise.resolve({ data: mockBusiness, error: null })),
              })),
            })),
          })),
        })),
      } as any);

      const result = await getBusinessBySlug('omd-1', 'test-business');
      expect(result).toEqual(mockBusiness);
    });

    it('should return null when business not found', async () => {
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Not found' } })),
                })),
                single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Not found' } })),
              })),
            })),
          })),
        })),
      } as any);

      const result = await getBusinessBySlug('omd-1', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getTranslation', () => {
    it('should return translation when found', async () => {
      const mockTranslation = { content: { title: 'Test Title' } };
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockTranslation, error: null })),
              })),
            })),
          })),
        })),
      } as any);

      const result = await getTranslation('section', 'section-1', 'en');
      expect(result).toEqual(mockTranslation.content);
    });

    it('should return null when translation not found', async () => {
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Not found' } })),
              })),
            })),
          })),
        })),
      } as any);

      const result = await getTranslation('section', 'section-1', 'en');
      expect(result).toBeNull();
    });
  });

  describe('getRoomsByHotel', () => {
    it('should return rooms for hotel', async () => {
      const mockRooms = [
        { id: '1', hotel_id: 'hotel-1', name: 'Double Room', is_available: true },
      ];
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockRooms, error: null })),
            })),
          })),
        })),
      } as any);

      const result = await getRoomsByHotel('hotel-1');
      expect(result).toEqual(mockRooms);
    });

    it('should return empty array on error', async () => {
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Error' } })),
            })),
          })),
        })),
      } as any);

      const result = await getRoomsByHotel('hotel-1');
      expect(result).toEqual([]);
    });
  });

  describe('getMenuItemsByRestaurant', () => {
    it('should return menu items for restaurant', async () => {
      const mockItems = [
        { id: '1', restaurant_id: 'rest-1', name: 'Pizza', available: true },
      ];
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockItems, error: null })),
              })),
            })),
          })),
        })),
      } as any);

      const result = await getMenuItemsByRestaurant('rest-1');
      expect(result).toEqual(mockItems);
    });
  });

  describe('getExperienceAvailability', () => {
    it('should return availability for experience', async () => {
      const mockAvailability = [
        { id: '1', experience_id: 'exp-1', date: '2025-01-15', is_available: true },
      ];
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  order: vi.fn(() => ({
                    order: vi.fn(() => Promise.resolve({ data: mockAvailability, error: null })),
                  })),
                })),
                order: vi.fn(() => ({
                  order: vi.fn(() => Promise.resolve({ data: mockAvailability, error: null })),
                })),
              })),
            })),
          })),
        })),
      } as any);

      const result = await getExperienceAvailability('exp-1');
      expect(result).toEqual(mockAvailability);
    });

    it('should filter by date range', async () => {
      const mockAvailability = [
        { id: '1', experience_id: 'exp-1', date: '2025-01-15', is_available: true },
      ];
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  order: vi.fn(() => ({
                    order: vi.fn(() => Promise.resolve({ data: mockAvailability, error: null })),
                  })),
                })),
              })),
            })),
          })),
        })),
      } as any);

      const result = await getExperienceAvailability('exp-1', '2025-01-01', '2025-01-31');
      expect(result).toEqual(mockAvailability);
    });
  });

  describe('getReviewsByBusiness', () => {
    it('should return reviews for business', async () => {
      const mockReviews = [
        { id: '1', business_id: 'biz-1', rating: 5, status: 'approved' },
      ];
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: mockReviews, error: null })),
              })),
            })),
          })),
        })),
      } as any);

      const result = await getReviewsByBusiness('biz-1');
      expect(result).toEqual(mockReviews);
    });

    it('should apply limit', async () => {
      const mockReviews = Array(20).fill(null).map((_, i) => ({
        id: String(i),
        business_id: 'biz-1',
        rating: 5,
        status: 'approved',
      }));
      
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: mockReviews, error: null })),
              })),
            })),
          })),
        })),
      } as any);

      const result = await getReviewsByBusiness('biz-1', 10);
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });
});

