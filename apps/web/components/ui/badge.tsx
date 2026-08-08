import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-semibold text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-accent-color text-accent-text shadow-xs',
        secondary: 'border-border bg-surface text-text',
        reading:
          'border-sky-500/40 bg-sky-500/15 text-sky-700 backdrop-blur-md dark:border-sky-400/40 dark:bg-sky-950/70 dark:text-sky-300',
        completed:
          'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 backdrop-blur-md dark:border-emerald-400/40 dark:bg-emerald-950/70 dark:text-emerald-300',
        plan: 'border-amber-500/40 bg-amber-500/15 text-amber-700 backdrop-blur-md dark:border-amber-400/40 dark:bg-amber-950/70 dark:text-amber-300',
        hold: 'border-orange-500/40 bg-orange-500/15 text-orange-700 backdrop-blur-md dark:border-orange-400/40 dark:bg-orange-950/70 dark:text-orange-300',
        dropped:
          'border-rose-500/40 bg-rose-500/15 text-rose-700 backdrop-blur-md dark:border-rose-400/40 dark:bg-rose-950/70 dark:text-rose-300',
        outline: 'border-border text-text',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
