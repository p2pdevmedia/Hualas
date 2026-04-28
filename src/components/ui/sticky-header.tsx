'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface StickyHeaderProps {
  children: React.ReactNode;
  threshold?: number;
  className?: string;
}

export function StickyHeader({
  children,
  threshold = 80,
  className,
}: StickyHeaderProps) {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > threshold);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return (
    <header
      data-scrolled={scrolled || undefined}
      className={cn(
        'sticky top-0 z-40 w-full transition-[background-color,backdrop-filter,border-color] duration-200',
        scrolled
          ? 'border-b border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60'
          : 'border-b border-transparent bg-transparent',
        className
      )}
    >
      {children}
    </header>
  );
}
