import Link from 'next/link';
import { cn } from '@/lib/utils';

type LabelBreakpoint = 'sm' | 'md' | 'lg' | 'xl';

interface BackButtonProps {
  href: string;
  label: string;
  className?: string;
  variant?: 'default' | 'inverted';
  labelBreakpoint?: LabelBreakpoint;
}

const labelVisibility: Record<LabelBreakpoint, string> = {
  sm: 'hidden sm:inline',
  md: 'hidden md:inline',
  lg: 'hidden lg:inline',
  xl: 'hidden xl:inline',
};

const variantClasses: Record<NonNullable<BackButtonProps['variant']>, string> = {
  default:
    'bg-white/95 text-blue-600 shadow-md ring-1 ring-gray-200 backdrop-blur hover:bg-white focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  inverted:
    'bg-white/10 text-white border border-white/30 hover:bg-white/20 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-700',
};

export default function BackButton({
  href,
  label,
  className,
  variant = 'default',
  labelBreakpoint = 'md',
}: BackButtonProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        'inline-flex h-11 w-11 items-center justify-center gap-2 rounded-full font-medium transition focus:outline-none focus-visible:ring-2 md:w-auto md:px-4',
        variantClasses[variant],
        className,
      )}
    >
      <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      <span className={cn('text-sm', labelVisibility[labelBreakpoint])}>{label}</span>
    </Link>
  );
}


