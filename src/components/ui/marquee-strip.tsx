import * as React from 'react';
import { cn } from '@/lib/utils';

interface MarqueeStripProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  speed?: 'slow' | 'normal' | 'fast';
  pauseOnHover?: boolean;
}

const SPEED: Record<NonNullable<MarqueeStripProps['speed']>, string> = {
  slow: '60s',
  normal: '40s',
  fast: '24s',
};

export function MarqueeStrip({
  children,
  speed = 'normal',
  pauseOnHover = true,
  className,
  ...props
}: MarqueeStripProps) {
  return (
    <div
      data-pause-on-hover={pauseOnHover ? 'true' : undefined}
      className={cn('marquee', className)}
      style={
        {
          '--marquee-duration': SPEED[speed],
        } as React.CSSProperties
      }
      {...props}
    >
      <div className="marquee__track" aria-hidden={false}>
        {children}
      </div>
      <div className="marquee__track" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
