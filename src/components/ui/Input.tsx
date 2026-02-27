import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const inputVariants = cva(
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
  {
    variants: {
      tone: {
        default: '',
        destructive:
          'border-red-200 text-red-700 focus-visible:ring-red-500 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-200',
      },
    },
    defaultVariants: {
      tone: 'default',
    },
  },
);

export type InputProps = InputHTMLAttributes<HTMLInputElement> & VariantProps<typeof inputVariants>;

const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, tone, ...props }, ref) {
  return <input ref={ref} className={cn(inputVariants({ tone }), className)} {...props} />;
});

export default Input;
