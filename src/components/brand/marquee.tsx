import { cn } from '@/lib/utils';

type Props = {
  /** Words to scroll. Repeated 4× for a seamless loop. */
  items: string[];
  /** Seconds per loop. Default 40. */
  duration?: number;
  pauseOnHover?: boolean;
  className?: string;
  /** Visual style. "default" = neutral, "primary" = teal bg, "dark" = ink bg. */
  variant?: 'default' | 'primary' | 'dark';
};

export default function Marquee({
  items,
  duration = 40,
  pauseOnHover = true,
  className,
  variant = 'default',
}: Props) {
  const variantClasses = {
    default: 'bg-muted text-foreground',
    primary: 'bg-primary text-primary-foreground',
    dark: 'bg-ink text-bone',
  } as const;
  // We render the items 4× to ensure a seamless loop on wide screens
  const repeated = [...items, ...items, ...items, ...items];
  return (
    <div
      className={cn(
        'marquee py-6 border-y border-border',
        variantClasses[variant],
        className
      )}
      data-pause-on-hover={pauseOnHover ? 'true' : 'false'}
      style={{ ['--marquee-duration' as never]: `${duration}s` }}
    >
      <div className="marquee__track">
        {repeated.map((item, i) => (
          <span
            key={i}
            className="font-heading text-3xl lg:text-5xl uppercase whitespace-nowrap flex items-center gap-8"
          >
            {item}
            <span aria-hidden className="text-current/40">
              ✦
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
