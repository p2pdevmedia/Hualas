import { cn } from '@/lib/utils';
import { type HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLSpanElement>;

/**
 * Tiny technical label in Archivo, uppercase, wide tracking.
 * Use for section eyebrows: "HUALAS · 02", "AGENDA 2025", etc.
 */
export default function Eyebrow({ className, children, ...rest }: Props) {
  return (
    <span
      className={cn(
        'font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground',
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
