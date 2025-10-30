'use client';

import { useEffect, useRef } from 'react';

interface TrackEventOptions {
  businessId: string;
  eventType: string;
  metadata?: Record<string, any>;
}

/**
 * Client-side hook for tracking analytics events
 * Automatically handles session ID generation and tracking
 */
export function useAnalytics() {
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Generate or retrieve session ID
    if (!sessionIdRef.current) {
      sessionIdRef.current = getOrCreateSessionId();
    }
  }, []);

  /**
   * Track an analytics event
   */
  const trackEvent = async (options: TrackEventOptions) => {
    try {
      const response = await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: options.businessId,
          eventType: options.eventType,
          metadata: options.metadata || {},
        }),
      });

      if (!response.ok) {
        console.error('Failed to track analytics event');
      }
    } catch (error) {
      console.error('Error tracking analytics event:', error);
    }
  };

  return { trackEvent };
}

/**
 * Get or create a session ID
 */
function getOrCreateSessionId(): string {
  // Try to get from localStorage
  let sessionId = localStorage.getItem('analytics_session_id');
  
  if (!sessionId) {
    // Generate new session ID
    sessionId = generateSessionId();
    localStorage.setItem('analytics_session_id', sessionId);
  }
  
  return sessionId;
}

/**
 * Generate a new session ID
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

