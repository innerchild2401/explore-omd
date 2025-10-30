import { createClient } from '@/lib/supabase/server';

interface TrackEventParams {
  businessId: string;
  eventType:
    | 'page_view'
    | 'detail_view'
    | 'gallery_view'
    | 'contact_click'
    | 'menu_view'
    | 'menu_item_view'
    | 'room_view'
    | 'availability_check'
    | 'time_slot_view'
    | 'booking_initiated'
    | 'booking_completed'
    | 'booking_cancelled';
  metadata?: Record<string, any>;
}

/**
 * Server-side function to track analytics events
 * This will be called from API routes
 */
export async function trackEvent(params: TrackEventParams, request?: Request) {
  const supabase = await createClient();
  
  try {
    // Get user info if authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    // Extract client info from request
    const sessionId = getSessionId(request);
    const ipAddress = getIpAddress(request);
    const userAgent = request?.headers.get('user-agent') || null;
    const referrer = request?.headers.get('referer') || null;
    const pageUrl = request?.url || null;
    
    // Call the database function
    const { error } = await supabase.rpc('track_analytics_event', {
      p_business_id: params.businessId,
      p_event_type: params.eventType,
      p_session_id: sessionId,
      p_user_id: user?.id || null,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_referrer: referrer,
      p_page_url: pageUrl,
      p_metadata: params.metadata || {},
      p_revenue_amount: null,
      p_currency: 'RON',
    });
    
    if (error) {
      console.error('Error tracking analytics event:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in trackEvent:', error);
    return { success: false, error };
  }
}

/**
 * Get or generate session ID from cookies/headers
 */
function getSessionId(request?: Request): string {
  if (!request) return generateSessionId();
  
  // Try to get from cookie
  const cookies = request.headers.get('cookie');
  if (cookies) {
    const match = cookies.match(/sessionId=([^;]+)/);
    if (match) return match[1];
  }
  
  // Generate new session ID
  return generateSessionId();
}

/**
 * Get client IP address
 */
function getIpAddress(request?: Request): string | null {
  if (!request) return null;
  
  // Try various headers for IP (for different proxy setups)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  
  return null;
}

/**
 * Generate a new session ID
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

