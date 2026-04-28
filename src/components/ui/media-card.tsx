import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { type MediaAsset, placeholderBgClass } from '@/lib/media';

type Variant = 'editorial' | 'cinematic';
type Ratio = '16/9' | '4/3' | '3/4';

interface MediaCardProps {
  media: MediaAsset;
  title: string;
  description?: string;
  eyebrow?: string;
  meta?: React.ReactNode;
  href?: string;
  variant?: Variant;
  ratio?: Ratio;
  className?: string;
  priority?: boolean;
}

const RATIO_CLASS: Record<Ratio, string> = {
  '16/9': 'aspect-[16/9]',
  '4/3': 'aspect-[4/3]',
  '3/4': 'aspect-[3/4]',
};

export function MediaCard({
  media,
  title,
  description,
  eyebrow,
  meta,
  href,
  variant = 'editorial',
  ratio = '16/9',
  className,
  priority = false,
}: MediaCardProps) {
  const isCinematic = variant === 'cinematic';
  const hasImage = media.src.length > 0;

  const wrapperClasses = cn(
    'group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-all duration-300',
    isCinematic
      ? 'shadow-soft hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-20px_hsl(var(--ink)/0.5)]'
      : 'shadow-soft hover:border-foreground/30',
    className
  );

  const inner = (
    <>
      <div
        className={cn(
          'relative w-full overflow-hidden',
          RATIO_CLASS[ratio],
          !hasImage && placeholderBgClass(media.placeholder)
        )}
      >
        {hasImage ? (
          <Image
            src={media.src}
            alt={media.alt}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            className={cn(
              'object-cover transition-transform duration-700 ease-out',
              isCinematic && 'group-hover:scale-[1.04]'
            )}
          />
        ) : null}
        {isCinematic ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-cinematic opacity-70 transition-opacity duration-300 group-hover:opacity-90"
          />
        ) : (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-cinematic opacity-0 transition-opacity duration-300 group-hover:opacity-50"
          />
        )}
        {eyebrow ? (
          <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-background/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-foreground backdrop-blur-md">
            {eyebrow}
          </span>
        ) : null}
        {isCinematic && meta ? (
          <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-bone">
            <div className="flex-1">
              <h3 className="font-heading text-2xl font-semibold leading-tight tracking-tight text-bone drop-shadow-sm">
                {title}
              </h3>
            </div>
            <div className="font-mono text-xs uppercase tracking-widest text-bone/80">
              {meta}
            </div>
          </div>
        ) : null}
      </div>

      {!isCinematic ? (
        <div className="flex flex-1 flex-col gap-2 p-5">
          <h3 className="font-heading text-xl font-semibold leading-tight tracking-tight">
            {title}
          </h3>
          {description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
          {meta ? (
            <div className="mt-auto pt-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {meta}
            </div>
          ) : null}
        </div>
      ) : description || (!meta && !isCinematic) ? (
        <div className="flex flex-col gap-1 p-5">
          {description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          wrapperClasses,
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
        )}
      >
        {inner}
      </Link>
    );
  }

  return <article className={wrapperClasses}>{inner}</article>;
}
