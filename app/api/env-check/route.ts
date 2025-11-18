/**
 * Environment Variable Check Endpoint
 * GET /api/env-check
 * 
 * Returns environment variable status (for debugging)
 * Only available in development mode
 */

import { NextResponse } from 'next/server';
import { env, isProduction } from '@/lib/env';

export async function GET() {
  // Only allow in development
  if (isProduction) {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  // Return environment variable status (without sensitive values)
  return NextResponse.json({
    status: 'ok',
    nodeEnv: env.NODE_ENV,
    variables: {
      NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
      MAILER_SEND_API_KEY: env.MAILER_SEND_API_KEY ? '✅ Set' : '⚠️ Optional',
      UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL ? '✅ Set' : '⚠️ Optional',
      UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN ? '✅ Set' : '⚠️ Optional',
      NEXT_PUBLIC_SITE_URL: env.NEXT_PUBLIC_SITE_URL || '⚠️ Using default',
      LOG_LEVEL: env.LOG_LEVEL || '⚠️ Using default',
    },
  });
}

