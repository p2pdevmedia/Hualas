'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface KineticRevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'none';
  once?: boolean;
  threshold?: number;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function KineticReveal({
  children,
  delay = 0,
  direction = 'up',
  once = true,
  threshold = 0.15,
  className,
  as: Tag = 'div',
}: KineticRevealProps) {
  const ref = React.useRef<HTMLElement>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [once, threshold]);

  const initialOffset =
    direction === 'up'
      ? 'translate-y-4'
      : direction === 'down'
        ? '-translate-y-4'
        : 'translate-y-0';

  const Element = Tag as React.ElementType;

  return (
    <Element
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100',
        visible ? 'translate-y-0 opacity-100' : `opacity-0 ${initialOffset}`,
        className
      )}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </Element>
  );
}
