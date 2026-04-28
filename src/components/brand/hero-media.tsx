import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Eyebrow from './eyebrow';

type CTA = {
  label: string;
  href: string;
};

type Props = {
  eyebrow?: string;
  headline: string;
  lede?: string;
  image: string;
  imageAlt?: string;
  cta?: CTA;
  secondaryCta?: CTA;
  /** "editorial" = full-bleed image with overlay text. "split" = 60/40 columns. "centered" = solid bg, image below. */
  variant?: 'editorial' | 'split' | 'centered';
  className?: string;
};

export default function HeroMedia({
  eyebrow,
  headline,
  lede,
  image,
  imageAlt = '',
  cta,
  secondaryCta,
  variant = 'editorial',
  className,
}: Props) {
  if (variant === 'split') {
    return (
      <section
        className={cn(
          'grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-0 min-h-[600px]',
          className
        )}
      >
        <div className="relative aspect-[4/3] lg:aspect-auto">
          <Image
            src={image}
            alt={imageAlt}
            fill
            sizes="(min-width: 1024px) 60vw, 100vw"
            priority
            className="object-cover"
          />
        </div>
        <div className="flex flex-col justify-center gap-6 px-6 py-16 lg:px-12 bg-background">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1 className="font-heading text-[clamp(48px,7vw,96px)] leading-[0.95] uppercase">
            {headline}
          </h1>
          {lede && (
            <p className="font-body normal-case text-base text-muted-foreground max-w-md leading-relaxed">
              {lede}
            </p>
          )}
          {(cta || secondaryCta) && (
            <div className="flex flex-wrap gap-3 pt-2">
              {cta && <CTAPill {...cta} variant="primary" />}
              {secondaryCta && <CTAPill {...secondaryCta} variant="ghost" />}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (variant === 'centered') {
    return (
      <section
        className={cn(
          'flex flex-col items-center text-center gap-6 px-6 py-20 bg-background',
          className
        )}
      >
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="font-heading text-[clamp(56px,9vw,140px)] leading-[0.92] uppercase max-w-5xl">
          {headline}
        </h1>
        {lede && (
          <p className="font-body normal-case text-lg text-muted-foreground max-w-2xl leading-relaxed">
            {lede}
          </p>
        )}
        {(cta || secondaryCta) && (
          <div className="flex flex-wrap gap-3 justify-center pt-4">
            {cta && <CTAPill {...cta} variant="primary" />}
            {secondaryCta && <CTAPill {...secondaryCta} variant="ghost" />}
          </div>
        )}
        <div className="relative w-full aspect-[16/7] mt-8 max-w-6xl">
          <Image
            src={image}
            alt={imageAlt}
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
        </div>
      </section>
    );
  }

  // editorial (default)
  return (
    <section className={cn('relative min-h-[88svh] flex', className)}>
      <Image
        src={image}
        alt={imageAlt}
        fill
        sizes="100vw"
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-cinematic-strong" />
      <div className="relative z-10 flex flex-col justify-end gap-6 w-full px-6 py-16 lg:px-12 lg:py-20 max-w-7xl mx-auto text-white">
        {eyebrow && (
          <Eyebrow className="text-white/80">{eyebrow}</Eyebrow>
        )}
        <h1 className="font-heading text-[clamp(56px,10vw,160px)] leading-[0.9] uppercase">
          {headline}
        </h1>
        {lede && (
          <p className="font-body normal-case text-base lg:text-lg text-white/85 max-w-2xl leading-relaxed">
            {lede}
          </p>
        )}
        {(cta || secondaryCta) && (
          <div className="flex flex-wrap gap-3 pt-2">
            {cta && <CTAPill {...cta} variant="primary" />}
            {secondaryCta && (
              <CTAPill {...secondaryCta} variant="ghost-on-dark" />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function CTAPill({
  label,
  href,
  variant = 'primary',
}: CTA & { variant?: 'primary' | 'ghost' | 'ghost-on-dark' }) {
  const base =
    'inline-flex items-center gap-2 rounded-full px-6 py-3 font-mono font-semibold uppercase tracking-[0.12em] text-xs transition-all';
  const styles = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    ghost:
      'border border-foreground/20 text-foreground hover:bg-foreground/5',
    'ghost-on-dark':
      'border border-white/40 text-white hover:bg-white/10',
  } as const;
  return (
    <Link href={href} className={cn(base, styles[variant])}>
      {label}
      <span aria-hidden>→</span>
    </Link>
  );
}
