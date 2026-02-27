import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'border border-transparent bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500',
        success: 'border border-transparent bg-emerald-600 text-white hover:bg-emerald-700 dark:hover:bg-emerald-500',
        accentBlue:
          'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30',
        accentEmerald:
          'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30',
        tab: 'border border-transparent bg-transparent text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200',
        tabActive: 'border border-transparent bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400',
        secondary:
          'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
        muted:
          'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
        danger:
          'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-500 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-200 dark:hover:bg-red-900/30',
        ghost:
          'border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
        plain: 'border border-transparent bg-transparent text-inherit hover:bg-transparent dark:hover:bg-transparent',
        iconSubtle:
          'border border-slate-200 bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
        iconDanger:
          'border border-transparent bg-transparent text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:ring-red-500 dark:text-slate-500 dark:hover:bg-red-900/20 dark:hover:text-red-400',
        floatingDanger:
          'border border-transparent bg-white/90 text-red-600 hover:bg-red-50 hover:text-red-700 dark:bg-slate-900/90 dark:text-red-400 dark:hover:bg-red-900/40',
      },
      size: {
        none: '',
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 py-1.5 text-xs font-semibold',
        xs: 'px-3 py-2 text-xs font-semibold',
        compact: 'px-3 py-1.5 text-xs font-semibold',
        chip: 'px-3 py-1 text-xs font-medium',
        chipStrong: 'px-3 py-1 text-xs font-bold',
        actionXs: 'px-4 py-2 text-xs font-semibold',
        actionSm: 'px-4 py-2 text-sm font-semibold',
        tab: 'px-4 py-2 text-sm font-medium',
        cta: 'px-4 py-3 text-sm font-bold',
        lg: 'h-11 px-6 py-2.5 font-bold',
        icon: 'h-8 w-8 p-0',
        iconSm: 'h-7 w-7 p-0',
        iconXs: 'h-4 w-4 p-0',
        iconLg: 'h-[38px] w-[38px] p-0',
      },
      radius: {
        default: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'default',
      radius: 'default',
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, radius, type = 'button', ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size, radius }), className)} {...props} />
  );
});

export default Button;
