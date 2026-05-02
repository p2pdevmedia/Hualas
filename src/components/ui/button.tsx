import * as React from 'react';
import { cn } from '@/lib/utils';
import { useFormPending } from './form';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive';
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', asChild, children, type, disabled, ...props }, ref) => {
    const formPending = useFormPending();
    const isDisabled = disabled || (type === 'submit' && formPending);

    const classes = cn(
      'inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
      variant === 'primary' &&
        'bg-primary text-primary-foreground hover:bg-primary/90',
      variant === 'outline' &&
        'border-[1.5px] border-primary text-primary hover:bg-primary/5',
      variant === 'ghost' &&
        'border border-border text-foreground hover:bg-muted',
      variant === 'destructive' &&
        'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      className
    );

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        className: cn(
          classes,
          (children.props as { className?: string }).className
        ),
      } as any);
    }

    return (
      <button ref={ref} className={classes} type={type} disabled={isDisabled} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
