'use client';

import { useEffect, useRef } from 'react';

interface TrackBlogViewProps {
  postId: string;
}

/**
 * Client component to track blog post views automatically
 * Similar to TrackPageView but for blog posts
 */
export default function TrackBlogView({ postId }: TrackBlogViewProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    // Only track once per component mount
    if (hasTracked.current) return;
    
    // Track the view
    const trackView = async () => {
      try {
        const response = await fetch('/api/blog/track-view', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            postId,
          }),
        });

        if (!response.ok) {
          console.error('Failed to track blog post view');
        } else {
          hasTracked.current = true;
        }
      } catch (error) {
        console.error('Error tracking blog post view:', error);
      }
    };

    trackView();
  }, [postId]);

  // This component doesn't render anything
  return null;
}

