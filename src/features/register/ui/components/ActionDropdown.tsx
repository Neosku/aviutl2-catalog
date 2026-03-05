/**
 * ドロップダウンリストコンポーネント
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { cva } from 'class-variance-authority';
import { Check, ChevronDown } from 'lucide-react';
import { surface } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';
import type { ActionDropdownProps } from '../types';

const triggerVariants = cva('w-full justify-between border px-3 py-2 shadow-sm transition-all', {
  variants: {
    open: {
      true: 'z-10 border-blue-500 ring-2 ring-blue-500/20',
      false:
        'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-700',
    },
  },
  defaultVariants: {
    open: false,
  },
});

const optionVariants = cva('w-full justify-between px-3 py-2 text-left transition-colors', {
  variants: {
    selected: {
      true: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      false: 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50',
    },
  },
  defaultVariants: {
    selected: false,
  },
});

const ActionDropdown = memo(function ActionDropdown({
  value,
  onChange,
  options,
  ariaLabel,
  buttonId,
  ariaLabelledby,
}: ActionDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const normalized = Array.isArray(options) ? options : [];
  const selected = normalized.find((opt) => opt.value === value) || null;
  const dropdownOptions = normalized.filter((opt) => opt.value !== '');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [value]);

  function choose(val: string) {
    setOpen(false);
    onChange?.(val);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div className="relative min-w-[140px]" ref={ref} onKeyDown={onKeyDown}>
      <Button
        variant="plain"
        size="none"
        type="button"
        id={buttonId}
        className={triggerVariants({ open })}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
      >
        <span className="truncate text-slate-700 dark:text-slate-200">
          {selected?.label || (value ? `未対応: ${value}` : '')}
        </span>
        <span className={cn('text-slate-400 transition-transform duration-200', open ? 'rotate-180' : '')} aria-hidden>
          <ChevronDown size={16} />
        </span>
      </Button>
      {open && (
        <div
          className={cn(
            surface.panel,
            'absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto p-1 shadow-xl ring-1 ring-slate-900/5 dark:ring-white/10',
          )}
          role="listbox"
        >
          {dropdownOptions.map((opt) => (
            <Button
              variant="plain"
              size="none"
              type="button"
              key={opt.value}
              className={optionVariants({ selected: opt.value === value })}
              role="option"
              aria-selected={opt.value === value}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(opt.value);
              }}
            >
              <span className="truncate">{opt.label}</span>
              {opt.value === value && <Check size={14} />}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
});

export default ActionDropdown;
