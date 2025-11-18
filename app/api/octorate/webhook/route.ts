import { NextRequest, NextResponse } from 'next/server';
import { processWebhook } from '@/lib/services/octorate/webhooks';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { rateLimitCheck } from '@/lib/middleware/rate-limit';

const WEBHOOK_SECRET = process.env.OCTORATE_WEBHOOK_SECRET || '';

// Octorate IP addresses that need to be whitelisted
// These IPs will call our webhook endpoints
const OCTORATE_WHITELISTED_IPS = [
  '94.177.193.204',
  '5.189.168.114',
];

/**
 * Get client IP address from request
 * Handles various proxy headers (X-Forwarded-For, X-Real-IP, etc.)
 */
function getClientIP(request: NextRequest): string | null {
  // Check X-Forwarded-For header (most common in proxied environments)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  // Check X-Real-IP header
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  // Fallback to connection remote address (if available)
  const remoteAddr = request.headers.get('remote-addr');
  if (remoteAddr) {
    return remoteAddr.trim();
  }

  return null;
}

/**
 * Verify that the request is coming from an authorized Octorate IP
 * Note: IP whitelisting may also need to be configured at infrastructure level
 * (firewall, Vercel Edge Config, etc.) depending on your hosting setup
 */
function verifyIPAddress(request: NextRequest): boolean {
  // In development, allow all IPs (for testing)
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const clientIP = getClientIP(request);
  
  if (!clientIP) {
    log.warn('Could not determine client IP address for Octorate webhook');
    return false; // Deny if we can't determine IP
  }

  // Check if IP is in whitelist
  const isWhitelisted = OCTORATE_WHITELISTED_IPS.includes(clientIP);
  
  if (!isWhitelisted) {
    log.warn('Unauthorized IP attempt for Octorate webhook', {
      clientIP,
      whitelistedIPs: OCTORATE_WHITELISTED_IPS,
    });
  }

  return isWhitelisted;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (higher limit for webhooks)
    const rateLimit = await rateLimitCheck(request, 'webhook');
    if (!rateLimit.success) {
      return rateLimit.response!;
    }

    // Verify IP address is from Octorate
    if (!verifyIPAddress(request)) {
      return NextResponse.json(
        { error: 'Unauthorized IP address' },
        { status: 403 }
      );
    }

    // Verify webhook signature (if provided by Octorate)
    const signature = request.headers.get('x-octorate-signature');
    if (WEBHOOK_SECRET && signature) {
      // Implement signature verification
      // const isValid = verifySignature(request.body, signature, WEBHOOK_SECRET);
      // if (!isValid) {
      //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      // }
    }

    const body = await request.json();
    const { eventType, accommodationId, payload } = body;

    // Get connection by accommodation ID
    const supabase = await createClient();
    const { data: connection } = await supabase
      .from('octorate_hotel_connections')
      .select('id')
      .eq('octorate_accommodation_id', accommodationId)
      .eq('is_active', true)
      .eq('is_connected', true)
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Process webhook
    await processWebhook(connection.id, {
      eventType,
      accommodationId,
      payload,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    log.error('Octorate webhook processing error', error, {
      url: request.url,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

