import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Eyebrow from './eyebrow';

type Props = {
  href: string;
  image: string;
  imageAlt?: string;
  eyebrow?: string;
  title: string;
  meta?: string[]; // e.g. ['12 Oct', 'Lanín', '8 cupos']
  className?: string;
  /** "tall" → 4:5 portrait. "wide" → 16:9. "square" → 1:1. */
  aspect?: 'tall' | 'wide' | 'square';
};

const aspectClasses = {
  tall: 'aspect-[4/5]',
  wide: 'aspect-[16/9]',
  square: 'aspect-square',
} as const;

export default function MediaCard({
  href,
  image,
  imageAlt = '',
  eyebrow,
  title,
  meta,
  aspect = 'tall',
  className,
}: Props) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex flex-col gap-4 outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden bg-muted',
          aspectClasses[aspect]
        )}
      >
        <Image
          src={image}
          alt={imageAlt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-col gap-2">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h3 className="font-heading text-2xl lg:text-3xl uppercase leading-[0.95] text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
        {meta && meta.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono normal-case text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {meta.map((m, i) => (
              <span key={i} className="flex items-center gap-3">
                {i > 0 && <span aria-hidden>·</span>}
                {m}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
