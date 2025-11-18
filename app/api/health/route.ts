/**
 * Health Check Endpoint
 * GET /api/health
 * 
 * Returns system health status for monitoring
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  const health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    checks: {
      database: 'ok' | 'error';
      api: 'ok' | 'error';
    };
    version: string;
    environment: string;
  } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: 'ok',
      api: 'ok',
    },
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
  };

  try {
    // Check database connection
    try {
      const supabase = await createClient();
      const { error } = await supabase.from('omds').select('id').limit(1);
      
      if (error) {
        health.checks.database = 'error';
        health.status = 'degraded';
        log.warn('Health check: Database connection failed', { error: error.message });
      }
    } catch (dbError) {
      health.checks.database = 'error';
      health.status = 'unhealthy';
      log.error('Health check: Database connection error', dbError);
    }

    // Check critical environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingEnvVars.length > 0) {
      health.status = 'unhealthy';
      log.error('Health check: Missing environment variables', null, { missing: missingEnvVars });
    }

    const responseTime = Date.now() - startTime;
    
    // Log health check
    log.info('Health check completed', {
      status: health.status,
      responseTime,
      checks: health.checks,
    });

    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.api = 'error';
    
    log.error('Health check: Unexpected error', error);
    
    return NextResponse.json(health, { status: 503 });
  }
}

