'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type MediaAsset, placeholderBgClass } from '@/lib/media';
import { Button } from './button';

type HeroHeight = 'screen' | 'half' | 'short';
type HeroAlign = 'left' | 'center';

interface HeroCta {
  href: string;
  label: string;
}

interface HeroMediaProps {
  media: MediaAsset;
  videoSrc?: string;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  primaryCta?: HeroCta;
  secondaryCta?: HeroCta;
  height?: HeroHeight;
  align?: HeroAlign;
  showScrollIndicator?: boolean;
  overlay?: 'soft' | 'strong';
  className?: string;
}

const HEIGHT_CLASS: Record<HeroHeight, string> = {
  screen: 'min-h-[calc(100svh-4rem)]',
  half: 'min-h-[60svh]',
  short: 'min-h-[40svh]',
};

export function HeroMedia({
  media,
  videoSrc,
  eyebrow,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  height = 'screen',
  align = 'left',
  showScrollIndicator = false,
  overlay = 'strong',
  className,
}: HeroMediaProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const hasImage = media.src.length > 0;

  React.useEffect(() => {
    if (!videoRef.current) return;
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (reduceMotion) {
      videoRef.current.pause();
    }
  }, []);

  return (
    <section
      className={cn(
        'relative isolate w-full overflow-hidden',
        HEIGHT_CLASS[height],
        !hasImage && !videoSrc && placeholderBgClass(media.placeholder),
        className
      )}
    >
      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          poster={hasImage ? media.src : undefined}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : hasImage ? (
        <Image
          src={media.src}
          alt={media.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : null}

      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0',
          overlay === 'strong'
            ? 'bg-gradient-cinematic-strong'
            : 'bg-gradient-cinematic'
        )}
      />

      <div
        className={cn(
          'relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-end gap-6 px-6 pb-16 pt-24',
          height === 'screen' && 'sm:pb-24',
          align === 'center' ? 'items-center text-center' : 'items-start'
        )}
      >
        {eyebrow ? (
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-bone/80">
            <span
              aria-hidden="true"
              className="inline-block h-px w-8 bg-bone/50"
            />
            {eyebrow}
          </span>
        ) : null}

        <h1
          className={cn(
            'max-w-4xl font-heading font-semibold leading-[1.05] tracking-tight text-bone',
            'text-[clamp(2.5rem,8vw,6rem)]'
          )}
        >
          {title}
        </h1>

        {subtitle ? (
          <p className="max-w-xl text-base text-bone/85 sm:text-lg">
            {subtitle}
          </p>
        ) : null}

        {primaryCta || secondaryCta ? (
          <div
            className={cn(
              'mt-2 flex flex-wrap gap-3',
              align === 'center' && 'justify-center'
            )}
          >
            {primaryCta ? (
              <Button asChild size="lg">
                <Link href={primaryCta.href}>{primaryCta.label}</Link>
              </Button>
            ) : null}
            {secondaryCta ? (
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="border-bone/30 bg-bone/5 text-bone hover:bg-bone/15"
              >
                <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {showScrollIndicator ? (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-6 z-10 flex justify-center text-bone/70 motion-reduce:hidden"
        >
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </div>
      ) : null}
    </section>
  );
}
