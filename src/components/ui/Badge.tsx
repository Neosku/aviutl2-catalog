import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const badgeVariants = cva('inline-flex items-center border', {
  variants: {
    variant: {
      neutral:
        'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
      primary:
        'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300',
      success:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300',
      danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300',
      outlineNeutral: 'border-slate-200 bg-transparent text-slate-600 dark:border-slate-700 dark:text-slate-300',
    },
    size: {
      default: 'px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
      xxs: 'px-1.5 py-0.5 text-[10px] font-semibold tracking-normal',
      sm: 'px-3 py-1 text-xs font-semibold tracking-normal',
    },
    shape: {
      pill: 'rounded-full',
      rounded: 'rounded-md',
    },
  },
  defaultVariants: {
    variant: 'neutral',
    size: 'default',
    shape: 'pill',
  },
});

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant, size, shape, ...props },
  ref,
) {
  return <span ref={ref} className={cn(badgeVariants({ variant, size, shape }), className)} {...props} />;
});

export default Badge;
