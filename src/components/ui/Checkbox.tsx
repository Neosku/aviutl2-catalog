import { Check, Minus } from 'lucide-react';

// 一覧用のカスタムチェックボックス
export default function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange?: () => void;
  ariaLabel?: string;
}) {
  const active = checked || indeterminate;

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.();
      }}
      className={`inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
        active
          ? 'border-blue-500 bg-blue-600 shadow-sm shadow-blue-500/30'
          : 'border-slate-300 bg-white text-transparent hover:border-slate-400 dark:border-slate-600 dark:bg-slate-900/60 dark:hover:border-slate-500'
      }`}
    >
      {indeterminate ? (
        <Minus size={14} className="transition-opacity opacity-100" />
      ) : (
        <Check size={14} className={`transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`} />
      )}
    </button>
  );
}
