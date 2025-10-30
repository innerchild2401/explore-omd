'use client';

import { useEffect } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

interface TrackPageViewProps {
  businessId: string;
  eventType: 'page_view' | 'detail_view';
}

/**
 * Client component to track page views automatically
 * Add this to any page that should track analytics
 */
export default function TrackPageView({ businessId, eventType }: TrackPageViewProps) {
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    // Track the page view on mount
    trackEvent({
      businessId,
      eventType,
    });
  }, [businessId, eventType, trackEvent]);

  // This component doesn't render anything
  return null;
}

