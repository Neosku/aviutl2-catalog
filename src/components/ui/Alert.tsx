import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const alertVariants = cva('rounded-lg border px-4 py-3 text-sm', {
  variants: {
    variant: {
      default:
        'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200',
      info: 'border-blue-100 bg-blue-50 text-blue-800 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-200',
      success:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200',
      warning:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200',
      danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type AlertProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>;

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert({ className, variant, ...props }, ref) {
  return <div ref={ref} className={cn(alertVariants({ variant }), className)} {...props} />;
});

const AlertTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(function AlertTitle(
  { className, children, ...props },
  ref,
) {
  return (
    <h5 ref={ref} className={cn('font-semibold', className)} {...props}>
      {children}
    </h5>
  );
});

const AlertDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function AlertDescription({ className, ...props }, ref) {
    return <p ref={ref} className={cn('mt-1 leading-relaxed', className)} {...props} />;
  },
);

export { Alert, AlertTitle, AlertDescription };
