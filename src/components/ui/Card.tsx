import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { text } from './_styles';

export const cardVariants = cva('border border-slate-200 dark:border-slate-800', {
  variants: {
    padding: {
      none: '',
      sm: 'p-3',
      default: 'p-4',
      lg: 'p-6',
    },
    tone: {
      default: 'bg-white dark:bg-slate-900',
      muted: 'bg-slate-50 dark:bg-slate-900/60',
      subtle: 'bg-slate-50 dark:bg-slate-800/50',
    },
    radius: {
      xl: 'rounded-xl',
      '2xl': 'rounded-2xl',
    },
    shadow: {
      none: '',
      sm: 'shadow-sm',
      xl: 'shadow-xl',
      '2xl': 'shadow-2xl',
    },
    overflow: {
      visible: '',
      hidden: 'overflow-hidden',
    },
  },
  defaultVariants: {
    padding: 'none',
    tone: 'default',
    radius: 'xl',
    shadow: 'sm',
    overflow: 'visible',
  },
});

export type CardProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>;

const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, padding, tone, radius, shadow, overflow, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn(cardVariants({ padding, tone, radius, shadow, overflow }), className)} {...props} />
  );
});

const cardSectionVariants = cva('px-6 py-4', {
  variants: {
    divider: {
      none: '',
      top: 'border-t border-slate-100 dark:border-slate-800',
      bottom: 'border-b border-slate-100 dark:border-slate-800',
    },
    tone: {
      default: '',
      muted: 'bg-slate-50/50 dark:bg-slate-900/50',
    },
  },
  defaultVariants: {
    divider: 'none',
    tone: 'default',
  },
});

type CardSectionProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardSectionVariants>;

const CardHeader = forwardRef<HTMLDivElement, CardSectionProps>(function CardHeader(
  { className, divider, tone, ...props },
  ref,
) {
  return <div ref={ref} className={cn(cardSectionVariants({ divider, tone }), className)} {...props} />;
});

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(function CardTitle(
  { className, children, ...props },
  ref,
) {
  return (
    <h3 ref={ref} className={cn(text.titleLg, className)} {...props}>
      {children}
    </h3>
  );
});

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(function CardDescription(
  { className, ...props },
  ref,
) {
  return <p ref={ref} className={cn('text-sm text-slate-500 dark:text-slate-400', className)} {...props} />;
});

const CardContent = forwardRef<HTMLDivElement, CardSectionProps>(function CardContent(
  { className, divider, tone, ...props },
  ref,
) {
  return <div ref={ref} className={cn(cardSectionVariants({ divider, tone }), className)} {...props} />;
});

const CardFooter = forwardRef<HTMLDivElement, CardSectionProps>(function CardFooter(
  { className, divider, tone, ...props },
  ref,
) {
  return <div ref={ref} className={cn(cardSectionVariants({ divider, tone }), className)} {...props} />;
});

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
