import { cva } from 'class-variance-authority';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';

const checkboxVariants = cva(
  'inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
  {
    variants: {
      active: {
        true: 'border-blue-500 bg-blue-600 shadow-sm shadow-blue-500/30',
        false:
          'border-slate-300 bg-white text-transparent hover:border-slate-400 dark:border-slate-600 dark:bg-slate-900/60 dark:hover:border-slate-500',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange?: () => void;
  ariaLabel?: string;
  className?: string;
}

// 一覧用のカスタムチェックボックス
export default function Checkbox({ checked, indeterminate = false, onChange, ariaLabel, className }: CheckboxProps) {
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
      className={cn(checkboxVariants({ active }), className)}
    >
      {indeterminate ? (
        <Minus size={14} className={cn('transition-opacity', active ? 'opacity-100' : 'opacity-0')} />
      ) : (
        <Check size={14} className={cn('transition-opacity', checked ? 'opacity-100' : 'opacity-0')} />
      )}
    </button>
  );
}
