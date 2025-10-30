'use client';

import React from 'react';

interface ContactLinkProps {
  businessId: string;
  type: 'phone' | 'email';
  value: string;
  className?: string;
  children?: React.ReactNode;
}

export default function ContactLink({ businessId, type, value, className, children }: ContactLinkProps) {
  const href = type === 'phone' ? `tel:${value}` : `mailto:${value}`;

  const handleClick = () => {
    try {
      const payload = {
        businessId,
        eventType: 'contact_click',
        metadata: { channel: type, value },
      } as const;

      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      // Fire-and-forget to avoid blocking navigation to tel/mailto
      navigator.sendBeacon?.('/api/analytics/track', blob);
      // Fallback to fetch if sendBeacon not available
      if (!navigator.sendBeacon) {
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {}
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children ?? value}
    </a>
  );
}


