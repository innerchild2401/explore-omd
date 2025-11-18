/**
 * Rate Limiting Middleware for Next.js API Routes
 * 
 * Usage in API route:
 *   import { withRateLimit } from '@/lib/middleware/rate-limit';
 *   
 *   export const POST = withRateLimit('public', async (request) => {
 *     // Your handler code
 *   });
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters, getRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';

type RateLimiterType = keyof typeof rateLimiters;

/**
 * Wrap an API route handler with rate limiting
 */
export function withRateLimit(
  limiterType: RateLimiterType,
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const limiter = rateLimiters[limiterType];
    const identifier = getRateLimitIdentifier(request);
    
    const { success, response } = await checkRateLimit(limiter, identifier);
    
    if (!success && response) {
      return NextResponse.json(
        JSON.parse(await response.text()),
        {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
        }
      );
    }
    
    // Add rate limit headers to successful responses
    const result = await limiter.limit(identifier);
    const handlerResponse = await handler(request);
    
    // Add rate limit headers
    handlerResponse.headers.set('X-RateLimit-Limit', result.limit.toString());
    handlerResponse.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    handlerResponse.headers.set('X-RateLimit-Reset', result.reset.toString());
    
    return handlerResponse;
  };
}

/**
 * Rate limit check helper (for manual use in routes)
 */
export async function rateLimitCheck(
  request: NextRequest,
  limiterType: RateLimiterType
): Promise<{ success: boolean; response?: NextResponse }> {
  const limiter = rateLimiters[limiterType];
  const identifier = getRateLimitIdentifier(request);
  
  const { success, response } = await checkRateLimit(limiter, identifier);
  
  if (!success && response) {
    return {
      success: false,
      response: NextResponse.json(
        JSON.parse(await response.text()),
        {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
        }
      ),
    };
  }
  
  return { success: true };
}

