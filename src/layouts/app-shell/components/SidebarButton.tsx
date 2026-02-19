import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface SidebarIconProps {
  size?: number;
  className?: string;
  'aria-hidden'?: boolean;
}

type SidebarIconType = React.ComponentType<SidebarIconProps> | ReactElement<SidebarIconProps>;
type SidebarButtonVariant = 'default' | 'action' | 'ghost';

interface PortalTooltipProps {
  text: string;
  rect: DOMRect | null;
}

interface SidebarButtonProps {
  icon?: SidebarIconType | null;
  label: string;
  onClick: () => void | Promise<void>;
  isActive?: boolean;
  isCollapsed: boolean;
  variant?: SidebarButtonVariant;
  badgeCount?: number;
  shortcut?: string;
  rightIcon?: React.ComponentType<{ size?: number; className?: string }>;
}

// Global state for tooltip grouping (fast-pass)
let globalTooltipRecent = false;
let globalTooltipTimer: ReturnType<typeof setTimeout> | null = null;

function warmTooltip(): void {
  globalTooltipRecent = true;
  if (globalTooltipTimer) clearTimeout(globalTooltipTimer);
}

function coolTooltip(): void {
  if (globalTooltipTimer) clearTimeout(globalTooltipTimer);
  globalTooltipTimer = setTimeout(() => {
    globalTooltipRecent = false;
  }, 500);
}

function PortalTooltip({ text, rect }: PortalTooltipProps) {
  const top = rect ? rect.top + rect.height / 2 : 0;
  const left = rect ? rect.right + 12 : 0;
  const tooltipStyle = useMemo(
    () => ({
      top: `${top}px`,
      left: `${left}px`,
      transform: 'translateY(-50%)',
    }),
    [top, left],
  );
  if (!rect || !text) return null;

  return createPortal(
    <div
      className="fixed z-[9999] px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-md shadow-xl font-sans border border-slate-700 dark:border-slate-600 pointer-events-none whitespace-nowrap"
      style={tooltipStyle}
    >
      {text}
    </div>,
    document.body,
  );
}

export default function SidebarButton({
  icon,
  label,
  onClick,
  isActive = false,
  isCollapsed,
  variant = 'default',
  badgeCount = 0,
  shortcut,
  rightIcon: RightIcon,
}: SidebarButtonProps) {
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = globalTooltipRecent ? 50 : 500;
    timerRef.current = setTimeout(() => {
      if (buttonRef.current) {
        setHoverRect(buttonRef.current.getBoundingClientRect());
        warmTooltip();
      }
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (hoverRect) coolTooltip();
    setHoverRect(null);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const baseClasses =
    'group relative w-full flex items-center rounded-xl transition-all duration-200 text-sm font-medium cursor-pointer overflow-hidden py-3 h-11 text-left';
  const variants: Record<SidebarButtonVariant, string> = {
    default: isActive
      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800',
    action:
      'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    ghost: isActive
      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800',
  };

  const iconClass = `shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`;

  let iconElement: ReactNode = null;
  if (React.isValidElement<SidebarIconProps>(icon)) {
    iconElement = React.cloneElement(icon, {
      className: `${icon.props?.className || ''} ${iconClass}`.trim(),
      'aria-hidden': icon.props?.['aria-hidden'] ?? true,
    });
  } else if (icon) {
    const IconComponent = icon as React.ComponentType<SidebarIconProps>;
    iconElement = <IconComponent size={20} className={iconClass} />;
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`${baseClasses} ${variants[variant]}`}
        type="button"
      >
        <div className="w-14 shrink-0 flex items-center justify-center">{iconElement}</div>
        {!isCollapsed ? <span className="truncate flex-1 pr-2">{label}</span> : null}
        {!isCollapsed && RightIcon ? <RightIcon size={18} className="opacity-50 shrink-0 mr-3" /> : null}
        {!isCollapsed && badgeCount > 0 ? (
          <span className="bg-red-500 text-white text-[10px] font-bold min-w-5 h-5 flex items-center justify-center rounded-full shadow-sm dark:shadow-red-900/20 px-1 mr-3">
            {badgeCount}
          </span>
        ) : null}
        {isCollapsed && badgeCount > 0 ? (
          <span className="absolute top-1.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-slate-900" />
        ) : null}
      </button>
      {shortcut ? <PortalTooltip text={`${label} (${shortcut})`} rect={hoverRect} /> : null}
    </>
  );
}
