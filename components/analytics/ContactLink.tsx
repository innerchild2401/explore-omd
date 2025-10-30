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

      // Use fetch with keepalive for reliable sending without blocking navigation
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children ?? value}
    </a>
  );
}


