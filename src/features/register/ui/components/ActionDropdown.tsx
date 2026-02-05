/**
 * ドロップダウンリストコンポーネント
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { ActionDropdownProps } from '../types';

const ActionDropdown = memo(
  function ActionDropdown({ value, onChange, options, ariaLabel, buttonId, ariaLabelledby }: ActionDropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);
    const normalized = Array.isArray(options) ? options : [];
    const selected = normalized.find((opt) => opt.value === value) || normalized[0] || { value: '', label: '' };
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
        <button
          type="button"
          id={buttonId}
          className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            open
              ? 'border-blue-500 ring-2 ring-blue-500/20 z-10'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-700'
          }`}
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
        >
          <span className="truncate text-slate-700 dark:text-slate-200">{selected?.label || value}</span>
          <span className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden>
            <ChevronDown size={16} />
          </span>
        </button>
        {open && (
          <div
            className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-800 dark:ring-white/10"
            role="listbox"
          >
            {dropdownOptions.map((opt) => (
              <button
                type="button"
                key={opt.value}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  opt.value === value
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50'
                }`}
                role="option"
                aria-selected={opt.value === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(opt.value);
                }}
              >
                <span className="truncate">{opt.label}</span>
                {opt.value === value && <Check size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
  (prev: Readonly<ActionDropdownProps>, next: Readonly<ActionDropdownProps>) =>
    prev.value === next.value && prev.ariaLabel === next.ariaLabel && prev.options === next.options,
);

export default ActionDropdown;
