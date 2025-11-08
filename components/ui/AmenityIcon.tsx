import Image from 'next/image';

interface AmenityIconProps {
  icon?: string | null;
  variant?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap: Record<NonNullable<AmenityIconProps['variant']>, string> = {
  xs: 'h-6 w-6 text-base',
  sm: 'h-8 w-8 text-lg',
  md: 'h-10 w-10 text-xl',
  lg: 'h-12 w-12 text-2xl',
};

const DefaultIcon = () => (
  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default function AmenityIcon({ icon, variant = 'md', className }: AmenityIconProps) {
  const colorClasses = className ? '' : 'bg-blue-50 text-blue-600';

  const containerClassName = [
    'flex items-center justify-center overflow-hidden rounded-full',
    sizeMap[variant],
    colorClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const trimmed = icon?.trim();

  if (!trimmed) {
    return (
      <span className={containerClassName}>
        <DefaultIcon />
      </span>
    );
  }

  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    return <span className={containerClassName} dangerouslySetInnerHTML={{ __html: trimmed }} aria-hidden="true" />;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return (
      <span className={containerClassName}>
        <Image
          src={trimmed}
          alt=""
          width={24}
          height={24}
          className="h-5 w-5 object-contain"
          aria-hidden="true"
        />
      </span>
    );
  }

  return (
    <span className={`${containerClassName} leading-none`}>
      <span className="leading-none">{trimmed}</span>
    </span>
  );
}


