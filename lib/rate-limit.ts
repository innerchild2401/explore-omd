/**
 * Rate Limiting Utility
 * 
 * Provides rate limiting for API endpoints using Upstash Redis (production)
 * or in-memory store (development/fallback).
 * 
 * Usage:
 *   import { rateLimit } from '@/lib/rate-limit';
 *   
 *   const limiter = rateLimit({
 *     interval: 60 * 1000, // 1 minute
 *     uniqueTokenPerInterval: 500, // Max 500 users per interval
 *   });
 *   
 *   const { success, limit, remaining, reset } = await limiter.limit(identifier);
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { log, logger } from './logger';

// In-memory fallback for development or when Upstash is not configured
class MemoryStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  async get(key: string): Promise<number | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    // Clean up expired entries
    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return null;
    }
    
    return entry.count;
  }

  async set(key: string, value: number, ttl: number): Promise<void> {
    this.store.set(key, {
      count: value,
      resetTime: Date.now() + ttl,
    });
  }

  async increment(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) {
      this.store.set(key, { count: 1, resetTime: Date.now() + 60000 });
      return 1;
    }
    
    if (Date.now() > entry.resetTime) {
      this.store.set(key, { count: 1, resetTime: Date.now() + 60000 });
      return 1;
    }
    
    entry.count++;
    return entry.count;
  }
}

// Create Redis client if Upstash is configured
let redis: Redis | null = null;
let useUpstash = false;

try {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  // Note: We can't import env here because this runs at module load time
  // and env validation might not have run yet. Using process.env directly is OK here.
  if (upstashUrl && upstashToken) {
    redis = new Redis({
      url: upstashUrl,
      token: upstashToken,
    });
    useUpstash = true;
    log.info('Rate limiting: Using Upstash Redis');
  } else {
    log.warn('Rate limiting: Upstash not configured, using in-memory store (not suitable for production)');
  }
} catch (error: unknown) {
  log.warn('Rate limiting: Failed to initialize Upstash, using in-memory store', {
    error: error instanceof Error ? error.message : String(error),
  });
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /**
   * Time window in milliseconds
   */
  interval: number;
  
  /**
   * Maximum number of requests per interval
   */
  limit: number;
  
  /**
   * Unique identifier for this rate limit (e.g., 'api', 'auth', 'contact')
   */
  identifier: string;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Create a rate limiter with the specified configuration
 */
export function createRateLimiter(config: RateLimitConfig) {
  if (useUpstash && redis) {
    // Use Upstash Redis for production
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.limit, `${config.interval} ms`),
      analytics: true,
      prefix: `ratelimit:${config.identifier}`,
    });

    return {
      limit: async (key: string): Promise<RateLimitResult> => {
        const result = await ratelimit.limit(key);
        return {
          success: result.success,
          limit: result.limit,
          remaining: result.remaining,
          reset: result.reset,
        };
      },
    };
  } else {
    // Fallback to in-memory store
    const store = new MemoryStore();
    const windowMs = config.interval;
    
    return {
      limit: async (key: string): Promise<RateLimitResult> => {
        const fullKey = `${config.identifier}:${key}`;
        const count = await store.increment(fullKey);
        const limit = config.limit;
        const success = count <= limit;
        
        // Get reset time (approximate)
        const entry = (store as any).store.get(fullKey);
        const reset = entry ? entry.resetTime : Date.now() + windowMs;
        
        return {
          success,
          limit,
          remaining: Math.max(0, limit - count),
          reset,
        };
      },
    };
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  // Public endpoints (contact forms, etc.)
  public: createRateLimiter({
    identifier: 'public',
    interval: 60 * 1000, // 1 minute
    limit: 10, // 10 requests per minute
  }),

  // Authentication endpoints
  auth: createRateLimiter({
    identifier: 'auth',
    interval: 60 * 1000, // 1 minute
    limit: 5, // 5 requests per minute (stricter for security)
  }),

  // Admin endpoints
  admin: createRateLimiter({
    identifier: 'admin',
    interval: 60 * 1000, // 1 minute
    limit: 100, // 100 requests per minute
  }),

  // Email endpoints
  email: createRateLimiter({
    identifier: 'email',
    interval: 60 * 1000, // 1 minute
    limit: 20, // 20 requests per minute
  }),

  // Webhook endpoints (higher limit for external services)
  webhook: createRateLimiter({
    identifier: 'webhook',
    interval: 60 * 1000, // 1 minute
    limit: 100, // 100 requests per minute
  }),

  // Feedback endpoints
  feedback: createRateLimiter({
    identifier: 'feedback',
    interval: 60 * 1000, // 1 minute
    limit: 10, // 10 requests per minute
  }),

  // API endpoints (general)
  api: createRateLimiter({
    identifier: 'api',
    interval: 60 * 1000, // 1 minute
    limit: 60, // 60 requests per minute
  }),
};

/**
 * Get client identifier for rate limiting
 * Uses IP address or user ID if available
 */
export function getRateLimitIdentifier(request: Request): string {
  // Try to get IP from headers (works with Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  const ip = forwardedFor?.split(',')[0]?.trim() || 
             realIp || 
             cfConnectingIp || 
             'unknown';
  
  return ip;
}

/**
 * Rate limit middleware helper
 * Returns a NextResponse with rate limit headers if exceeded
 */
export async function checkRateLimit(
  limiter: ReturnType<typeof createRateLimiter>,
  identifier: string
): Promise<{ success: boolean; response?: Response }> {
  const result = await limiter.limit(identifier);
  
  if (!result.success) {
    log.warn('Rate limit exceeded', {
      identifier,
      limit: result.limit,
      remaining: result.remaining,
    });
    
    const response = new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toString(),
          'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
        },
      }
    );
    
    return { success: false, response };
  }
  
  return { success: true };
}

