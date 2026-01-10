import React from 'react';

// 円形の進捗リングを表示するシンプルなコンポーネント
export default function ProgressCircle({
  value = 0,
  size = 24,
  strokeWidth = 4,
  showValue = false,
  ariaLabel,
  className,
}) {
  const clamped = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const radius = Math.max((size - strokeWidth) / 2, strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);
  const percent = Math.round(clamped * 100);
  const label = ariaLabel || `進行度 ${percent}%`;

  return (
    <span
      className={`relative inline-flex items-center justify-center ${className || ''}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg
        className="-rotate-90"
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        focusable="false"
        aria-hidden="true"
      >
        <circle
          className="text-slate-200 dark:text-slate-700"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="none"
        />
        <circle
          className={className ? "" : "text-blue-600"}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="none"
        />
      </svg>
      {showValue ? (
        <span className="absolute text-[10px] font-semibold text-slate-600 dark:text-slate-200">{percent}</span>
      ) : null}
    </span>
  );
}
