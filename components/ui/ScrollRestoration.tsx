'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface ScrollRestorationProps {
  storageKey?: string;
}

export default function ScrollRestoration({ storageKey }: ScrollRestorationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaultKey = `${pathname}?${searchParams?.toString() ?? ''}`;
  const key = `scroll:${storageKey ?? defaultKey}`;

  useEffect(() => {
    const restore = () => {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        const y = Number(stored);
        if (!Number.isNaN(y)) {
          window.scrollTo(0, y);
        }
      }
    };

    restore();
  }, [key]);

  useEffect(() => {
    const save = () => {
      sessionStorage.setItem(key, String(window.scrollY));
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        save();
      }
    };

    window.addEventListener('beforeunload', save);
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      save();
      window.removeEventListener('beforeunload', save);
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [key]);

  return null;
}


