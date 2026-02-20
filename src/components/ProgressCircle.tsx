import { useMemo } from 'react';

// 円形の進捗リングを表示するシンプルなコンポーネント
interface ProgressCircleProps {
  value?: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  showComplete?: boolean;
  ariaLabel?: string;
  className?: string;
  progressColorClassName?: string;
}

const textColorClassPattern = /\b(?:dark:)?text-(?:white|black|transparent|current|[a-z]+-\d{2,3}(?:\/\d{1,3})?)\b/g;

function extractTextColorClasses(className: string): string {
  const matches = className.match(textColorClassPattern);
  return matches ? matches.join(' ') : '';
}

export default function ProgressCircle({
  value = 0,
  size = 24,
  strokeWidth = 4,
  showValue = false,
  showComplete = false,
  ariaLabel,
  className = '',
  progressColorClassName,
}: ProgressCircleProps) {
  const clamped = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const center = size / 2;
  const radius = Math.max((size - strokeWidth) / 2, strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);
  const percent = Math.round(clamped * 100);
  const label = ariaLabel || `進行度 ${percent}%`;
  const isComplete = showComplete && clamped >= 1;
  const iconSize = Math.max(12, Math.round(size * 0.5));
  const legacyColorClasses = useMemo(() => extractTextColorClasses(className), [className]);
  const progressColorClasses = progressColorClassName || legacyColorClasses || 'text-blue-600';
  const sizeStyle = useMemo(() => ({ width: `${size}px`, height: `${size}px` }), [size]);
  const baseCircleProps = {
    cx: center,
    cy: center,
    r: radius,
    strokeWidth,
    stroke: 'currentColor',
    fill: 'none' as const,
  };

  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label}
      style={sizeStyle}
    >
      <svg
        className="-rotate-90"
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        focusable="false"
        aria-hidden="true"
      >
        <circle className="text-slate-200 dark:text-slate-700" {...baseCircleProps} />
        <circle
          className={progressColorClasses}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          {...baseCircleProps}
        />
      </svg>
      {showValue && !isComplete ? (
        <span className="absolute text-[10px] font-semibold text-slate-600 dark:text-slate-200">{percent}</span>
      ) : null}
      {isComplete ? (
        <svg className="absolute" viewBox="0 0 24 24" width={iconSize} height={iconSize} aria-hidden="true">
          <path
            d="M20 6L9 17L4 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  );
}
