interface OmdMemberBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function OmdMemberBadge({ className = '', size = 'md' }: OmdMemberBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full bg-black text-white font-semibold ${sizeClasses[size]} ${className}`}
      title="Membru OMD"
    >
      Membru OMD
    </span>
  );
}

