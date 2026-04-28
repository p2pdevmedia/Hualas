'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CarouselProps {
  children: React.ReactNode;
  ariaLabel: string;
  itemClassName?: string;
  className?: string;
  showDots?: boolean;
  showArrows?: boolean;
}

export function Carousel({
  children,
  ariaLabel,
  itemClassName = 'min-w-[80%] sm:min-w-[55%] md:min-w-[40%] lg:min-w-[31%]',
  className,
  showDots = true,
  showArrows = true,
}: CarouselProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = React.useState(0);
  const [maxScroll, setMaxScroll] = React.useState(0);
  const [pageCount, setPageCount] = React.useState(1);
  const [pageIndex, setPageIndex] = React.useState(0);

  const items = React.Children.toArray(children);

  const updateMetrics = React.useCallback(() => {
    const node = trackRef.current;
    if (!node) return;
    const max = Math.max(0, node.scrollWidth - node.clientWidth);
    setMaxScroll(max);
    const visibleWidth = node.clientWidth;
    const pages = Math.max(1, Math.ceil(node.scrollWidth / visibleWidth));
    setPageCount(pages);
  }, []);

  React.useEffect(() => {
    updateMetrics();
    const node = trackRef.current;
    if (!node) return;
    function onScroll() {
      if (!node) return;
      setScroll(node.scrollLeft);
      const visibleWidth = node.clientWidth;
      if (visibleWidth > 0) {
        setPageIndex(Math.round(node.scrollLeft / visibleWidth));
      }
    }
    node.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(updateMetrics);
    ro.observe(node);
    return () => {
      node.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [updateMetrics]);

  function scrollByPage(direction: 1 | -1) {
    const node = trackRef.current;
    if (!node) return;
    node.scrollBy({
      left: direction * node.clientWidth * 0.9,
      behavior: 'smooth',
    });
  }

  function scrollToPage(index: number) {
    const node = trackRef.current;
    if (!node) return;
    node.scrollTo({ left: index * node.clientWidth, behavior: 'smooth' });
  }

  // Pointer drag support
  const dragState = React.useRef<{
    active: boolean;
    startX: number;
    startScroll: number;
    pointerId: number | null;
  }>({ active: false, startX: 0, startScroll: 0, pointerId: null });

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse') return; // touch usa scroll nativo
    const node = trackRef.current;
    if (!node) return;
    dragState.current = {
      active: true,
      startX: e.clientX,
      startScroll: node.scrollLeft,
      pointerId: e.pointerId,
    };
    node.setPointerCapture(e.pointerId);
    node.style.cursor = 'grabbing';
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current.active) return;
    const node = trackRef.current;
    if (!node) return;
    const dx = e.clientX - dragState.current.startX;
    node.scrollLeft = dragState.current.startScroll - dx;
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current.active) return;
    const node = trackRef.current;
    if (!node) return;
    if (dragState.current.pointerId !== null) {
      node.releasePointerCapture(dragState.current.pointerId);
    }
    dragState.current.active = false;
    node.style.cursor = '';
  }

  const atStart = scroll <= 1;
  const atEnd = scroll >= maxScroll - 1;

  return (
    <div
      className={cn('relative', className)}
      aria-roledescription="carousel"
      aria-label={ariaLabel}
    >
      <div
        ref={trackRef}
        className={cn(
          'scroll-snap-x flex gap-4 overflow-x-auto pb-2 select-none',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          'cursor-grab'
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        tabIndex={0}
        role="group"
      >
        {items.map((child, i) => (
          <div key={i} className={cn('shrink-0', itemClassName)}>
            {child}
          </div>
        ))}
      </div>

      {showArrows && pageCount > 1 ? (
        <>
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            aria-label="Anterior"
            disabled={atStart}
            className={cn(
              'absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-soft backdrop-blur-md transition-opacity sm:inline-flex',
              'hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'disabled:pointer-events-none disabled:opacity-30'
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            aria-label="Siguiente"
            disabled={atEnd}
            className={cn(
              'absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-soft backdrop-blur-md transition-opacity sm:inline-flex',
              'hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'disabled:pointer-events-none disabled:opacity-30'
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      ) : null}

      {showDots && pageCount > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToPage(i)}
              aria-label={`Ir a la página ${i + 1}`}
              aria-current={i === pageIndex || undefined}
              className={cn(
                'h-1.5 rounded-full transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                i === pageIndex
                  ? 'w-6 bg-foreground'
                  : 'w-1.5 bg-foreground/30 hover:bg-foreground/60'
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
