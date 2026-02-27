import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const labelVariants = cva('block text-sm font-medium text-slate-700 dark:text-slate-200', {
  variants: {
    spacing: {
      none: '',
      sm: 'mb-1',
      default: 'mb-1.5',
      lg: 'mb-2',
    },
  },
  defaultVariants: {
    spacing: 'none',
  },
});

export interface LabelProps
  extends Omit<LabelHTMLAttributes<HTMLLabelElement>, 'htmlFor'>, VariantProps<typeof labelVariants> {
  htmlFor: string;
}

const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { className, spacing, htmlFor, children, ...props },
  ref,
) {
  return (
    <label ref={ref} htmlFor={htmlFor} className={cn(labelVariants({ spacing }), className)} {...props}>
      {children}
    </label>
  );
});

export default Label;
