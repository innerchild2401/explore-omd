'use client';

import { useEffect, useRef } from 'react';

interface DimensionLoggerProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function DimensionLogger({ label, children, className = '', style }: DimensionLoggerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const logDimensions = () => {
      const rect = ref.current!.getBoundingClientRect();
      const styles = window.getComputedStyle(ref.current!);
      console.log(`[${label}]`, {
        width: rect.width,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        computedWidth: styles.width,
        computedMaxWidth: styles.maxWidth,
        computedMinWidth: styles.minWidth,
        boxSizing: styles.boxSizing,
        overflow: styles.overflow,
        scrollWidth: ref.current!.scrollWidth,
        clientWidth: ref.current!.clientWidth,
        offsetWidth: ref.current!.offsetWidth,
      });
    };

    // Log initially
    logDimensions();

    // Log on resize
    window.addEventListener('resize', logDimensions);

    // Log on image load (check periodically)
    const interval = setInterval(logDimensions, 500);
    setTimeout(() => clearInterval(interval), 10000); // Stop after 10 seconds

    return () => {
      window.removeEventListener('resize', logDimensions);
      clearInterval(interval);
    };
  }, [label]);

  return (
    <div 
      ref={ref} 
      className={className}
      style={{
        border: '2px solid red',
        position: 'relative',
        ...style,
      }}
      data-debug-label={label}
    >
      {children}
      {/* Debug overlay */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          background: 'rgba(255, 0, 0, 0.1)',
          padding: '2px 4px',
          fontSize: '10px',
          zIndex: 9999,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
    </div>
  );
}

