import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition-colors focus:outline-none disabled:opacity-50',
        variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'outline' && 'border-[1.5px] border-primary text-primary hover:bg-primary/5',
        variant === 'ghost' && 'border border-border text-foreground hover:bg-muted',
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
