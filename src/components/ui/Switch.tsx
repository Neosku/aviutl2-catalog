import { cva } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const switchTrackVariants = cva(
  'relative inline-flex items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
  {
    variants: {
      size: {
        sm: 'h-5 w-9',
        default: 'h-7 w-14',
      },
      checked: {
        true: 'bg-blue-600 hover:bg-blue-700',
        false: 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600',
      },
    },
    defaultVariants: {
      size: 'default',
      checked: false,
    },
  },
);

const switchThumbVariants = cva('rounded-full bg-white shadow transition-transform', {
  variants: {
    size: {
      sm: 'h-3 w-3',
      default: 'h-5 w-5',
    },
    checked: {
      true: '',
      false: '',
    },
  },
  defaultVariants: {
    size: 'default',
    checked: false,
  },
});

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: 'sm' | 'default';
  thumbClassName?: string;
}

const thumbTransformClassBySize = {
  sm: {
    checked: 'translate-x-4',
    unchecked: 'translate-x-1',
  },
  default: {
    checked: 'translate-x-8',
    unchecked: 'translate-x-1',
  },
} as const;

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  {
    checked,
    onCheckedChange,
    className,
    size = 'default',
    thumbClassName,
    children,
    onClick,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      role="switch"
      aria-checked={checked}
      className={cn(switchTrackVariants({ size, checked }), className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          onCheckedChange?.(!checked);
        }
      }}
      {...props}
    >
      <span
        className={cn(
          switchThumbVariants({ size, checked }),
          checked ? thumbTransformClassBySize[size].checked : thumbTransformClassBySize[size].unchecked,
          thumbClassName,
        )}
      >
        {children}
      </span>
    </button>
  );
});

export default Switch;
