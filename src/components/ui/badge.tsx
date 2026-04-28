import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/10 text-primary',
        secondary:
          'border-transparent bg-secondary/15 text-secondary-foreground/90',
        outline: 'border-border text-foreground bg-transparent',
        success: 'border-transparent bg-success/10 text-success',
        destructive: 'border-transparent bg-destructive/10 text-destructive',
        accent:
          'border border-accent/40 bg-accent/10 text-accent-foreground/80',
        warning: 'border-transparent bg-warning/15 text-warning-foreground',
        muted: 'border-transparent bg-muted text-muted-foreground',
      },
      size: {
        sm: 'text-[10px] px-2 py-px',
        md: 'text-xs px-2.5 py-0.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { badgeVariants };
