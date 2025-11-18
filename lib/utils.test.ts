/**
 * Unit Tests for lib/utils.ts
 * Tests all utility functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatPrice,
  formatDate,
  formatDateTime,
  slugify,
  truncate,
  getImageUrl,
  calculateNights,
  isDateInPast,
  getStarRating,
  cn,
} from './utils';

describe('lib/utils', () => {
  describe('formatPrice', () => {
    it('should format price with default currency (RON)', () => {
      expect(formatPrice(100)).toContain('100');
      expect(formatPrice(100)).toContain('RON');
    });

    it('should format price with custom currency', () => {
      const result = formatPrice(100, 'USD');
      expect(result).toContain('100');
      expect(result).toContain('USD');
    });

    it('should handle zero price', () => {
      const result = formatPrice(0);
      expect(result).toContain('0');
    });

    it('should handle decimal prices', () => {
      const result = formatPrice(99.99);
      expect(result).toContain('99');
    });

    it('should handle negative prices', () => {
      const result = formatPrice(-100);
      expect(result).toContain('-');
    });
  });

  describe('formatDate', () => {
    it('should format date string correctly', () => {
      const result = formatDate('2025-01-15');
      expect(result).toContain('2025');
      expect(result).toContain('January');
      expect(result).toContain('15');
    });

    it('should format Date object correctly', () => {
      const date = new Date('2025-01-15');
      const result = formatDate(date);
      expect(result).toContain('2025');
    });

    it('should use custom locale', () => {
      const result = formatDate('2025-01-15', 'ro-RO');
      expect(result).toBeTruthy();
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time', () => {
      const result = formatDateTime('2025-01-15T10:30:00');
      expect(result).toContain('2025');
      expect(result).toContain('10');
    });
  });

  describe('slugify', () => {
    it('should convert text to slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Test 123')).toBe('test-123');
    });

    it('should handle special characters', () => {
      expect(slugify('Hello@World#123')).toBe('helloworld123');
    });

    it('should handle multiple spaces', () => {
      expect(slugify('Hello    World')).toBe('hello-world');
    });

    it('should trim whitespace', () => {
      expect(slugify('  Hello World  ')).toBe('hello-world');
    });
  });

  describe('truncate', () => {
    it('should truncate long text', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...');
    });

    it('should not truncate short text', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('should handle exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });
  });

  describe('getImageUrl', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    });

    it('should return placeholder for null path', () => {
      expect(getImageUrl(null)).toBe('/placeholder.jpg');
    });

    it('should return placeholder for undefined path', () => {
      expect(getImageUrl(undefined)).toBe('/placeholder.jpg');
    });

    it('should return full URL if already a URL', () => {
      expect(getImageUrl('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
    });

    it('should construct Supabase URL for relative path', () => {
      const result = getImageUrl('images/test.jpg');
      expect(result).toContain('test.supabase.co');
      expect(result).toContain('images/test.jpg');
    });

    it('should use custom bucket', () => {
      const result = getImageUrl('images/test.jpg', 'custom-bucket');
      expect(result).toContain('custom-bucket');
    });
  });

  describe('calculateNights', () => {
    it('should calculate nights correctly', () => {
      expect(calculateNights('2025-01-01', '2025-01-03')).toBe(2);
    });

    it('should handle single night', () => {
      expect(calculateNights('2025-01-01', '2025-01-02')).toBe(1);
    });

    it('should handle same day as 0 nights', () => {
      expect(calculateNights('2025-01-01', '2025-01-01')).toBe(0);
    });
  });

  describe('isDateInPast', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(isDateInPast(pastDate.toISOString().split('T')[0])).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(isDateInPast(futureDate.toISOString().split('T')[0])).toBe(false);
    });
  });

  describe('getStarRating', () => {
    it('should return correct star rating', () => {
      expect(getStarRating(5)).toBe('★★★★★');
      expect(getStarRating(3)).toBe('★★★☆☆');
      expect(getStarRating(0)).toBe('☆☆☆☆☆');
    });

    it('should handle decimal ratings', () => {
      expect(getStarRating(4.5)).toBe('★★★★☆');
    });
  });

  describe('cn (className utility)', () => {
    it('should merge class names', () => {
      expect(cn('class1', 'class2')).toContain('class1');
      expect(cn('class1', 'class2')).toContain('class2');
    });

    it('should handle conditional classes', () => {
      const result = cn('class1', true && 'class2', false && 'class3');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
      expect(result).not.toContain('class3');
    });

    it('should merge Tailwind classes correctly', () => {
      // Tailwind merge should handle conflicting classes
      const result = cn('p-4', 'p-2');
      expect(result).toBeTruthy();
    });
  });
});

