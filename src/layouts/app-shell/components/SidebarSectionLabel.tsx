interface SidebarSectionLabelProps {
  label: string;
  isCollapsed: boolean;
  hideDivider?: boolean;
  className?: string;
}

export default function SidebarSectionLabel({
  label,
  isCollapsed,
  hideDivider = false,
  className = '',
}: SidebarSectionLabelProps) {
  return (
    <div
      className={`h-4 flex items-center shrink-0 transition-all duration-200 ${className} ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
    >
      {isCollapsed ? (
        !hideDivider && <div className="w-8 h-[1px] bg-slate-200 dark:bg-slate-800" />
      ) : (
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap overflow-hidden block">
          {label}
        </span>
      )}
    </div>
  );
}
