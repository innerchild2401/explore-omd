/**
 * Health Check Endpoint
 * GET /api/health
 * 
 * Returns system health status for monitoring
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

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
        logger.warn({ error: error.message }, 'Health check: Database connection failed');
      }
    } catch (dbError) {
      health.checks.database = 'error';
      health.status = 'unhealthy';
      const errorContext = dbError instanceof Error 
        ? { error: { message: dbError.message, stack: dbError.stack, name: dbError.name } }
        : { error: String(dbError) };
      logger.error(errorContext, 'Health check: Database connection error');
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
      logger.error({ missing: missingEnvVars }, 'Health check: Missing environment variables');
    }

    const responseTime = Date.now() - startTime;
    
    // Log health check
    logger.info({
      status: health.status,
      responseTime,
      checks: health.checks,
    }, 'Health check completed');

    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.api = 'error';
    
    const errorContext = error instanceof Error 
      ? { error: { message: error.message, stack: error.stack, name: error.name } }
      : { error: String(error) };
    logger.error(errorContext, 'Health check: Unexpected error');
    
    return NextResponse.json(health, { status: 503 });
  }
}

