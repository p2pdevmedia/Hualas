import Link from 'next/link';
import { cn } from '@/lib/utils';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type CommonProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'ghost-on-dark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

type AsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AsLink = CommonProps & { href: string };

type Props = AsButton | AsLink;

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-mono font-semibold uppercase tracking-[0.12em] transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

const variantClasses = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
  ghost: 'border border-foreground/20 text-foreground hover:bg-foreground/5',
  'ghost-on-dark': 'border border-white/40 text-white hover:bg-white/10',
} as const;

const sizeClasses = {
  sm: 'text-[11px] px-4 py-2',
  md: 'text-xs px-6 py-3',
  lg: 'text-sm px-8 py-4',
} as const;

const CTAButton = forwardRef<HTMLElement, Props>(function CTAButton(
  { children, variant = 'primary', size = 'md', className, ...rest },
  ref
) {
  const cls = cn(
    base,
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  if ('href' in rest && rest.href) {
    return (
      <Link
        href={rest.href}
        className={cls}
        ref={ref as React.Ref<HTMLAnchorElement>}
      >
        {children}
        <span aria-hidden>→</span>
      </Link>
    );
  }

  const { href: _, ...buttonProps } = rest as AsButton;
  return (
    <button
      className={cls}
      ref={ref as React.Ref<HTMLButtonElement>}
      {...buttonProps}
    >
      {children}
    </button>
  );
});

export default CTAButton;
