interface VerificationBadgeProps {
  score: number;
  recommendation: 'approve' | 'request_changes' | 'reject';
  size?: 'small' | 'medium' | 'large';
}

const sizeClasses = {
  small: {
    container: 'w-8 h-8 text-[10px]',
    tooltip: 'text-xs',
  },
  medium: {
    container: 'w-10 h-10 text-xs',
    tooltip: 'text-sm',
  },
  large: {
    container: 'w-12 h-12 text-sm',
    tooltip: 'text-base',
  },
};

const recommendationConfig = {
  approve: {
    color: 'var(--accent)',
    bg: 'var(--accent-dim)',
    border: 'var(--accent-border)',
    text: 'Approve',
  },
  request_changes: {
    color: 'var(--pending)',
    bg: 'var(--pending-dim)',
    border: 'var(--pending-border)',
    text: 'Request Changes',
  },
  reject: {
    color: 'var(--danger)',
    bg: 'var(--danger-dim)',
    border: 'var(--danger-border)',
    text: 'Reject',
  },
};

export default function VerificationBadge({
  score,
  recommendation,
  size = 'medium',
}: VerificationBadgeProps) {
  const config = recommendationConfig[recommendation];
  const sizeClass = sizeClasses[size];

  return (
    <div className="relative group inline-block">
      {/* Badge */}
      <div
        className={`${sizeClass.container} rounded-full flex items-center justify-center font-medium font-mono`}
        style={{
          color: config.color,
          background: config.bg,
          border: `1px solid ${config.border}`,
        }}
      >
        {score}
      </div>

      {/* Tooltip */}
      <div
        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-10 ${sizeClass.tooltip}`}
        style={{
          color: config.color,
          background: config.bg,
          border: `1px solid ${config.border}`,
        }}
      >
        {config.text}
        {/* Tooltip arrow */}
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: `4px solid ${config.border}`,
          }}
        />
      </div>
    </div>
  );
}
