import type { ReactNode } from 'react';

interface SettingToggleRowProps {
  title: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onToggle: () => void;
  thumbContent?: ReactNode;
}

export default function SettingToggleRow({
  title,
  description,
  checked,
  onToggle,
  thumbContent,
}: SettingToggleRowProps) {
  const thumbClassName = thumbContent
    ? 'flex items-center justify-center h-5 w-5 transform rounded-full bg-white shadow transition-transform'
    : 'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="text-sm font-medium">{title}</div>
          {description ? <div className="text-xs text-slate-500 dark:text-slate-400">{description}</div> : null}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`shrink-0 relative inline-flex h-7 w-14 items-center rounded-full transition-colors cursor-pointer ${checked ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}
        >
          <span className={`${thumbClassName} ${checked ? 'translate-x-8' : 'translate-x-1'}`}>{thumbContent}</span>
        </button>
      </div>
    </div>
  );
}
