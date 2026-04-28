import { cn } from '@/lib/utils';
import Eyebrow from './eyebrow';

type Props = {
  /** "01", "02", … */
  number?: string;
  eyebrow?: string;
  title: string;
  lede?: string;
  className?: string;
  /** Text alignment. */
  align?: 'left' | 'center';
};

export default function SectionHeader({
  number,
  eyebrow,
  title,
  lede,
  align = 'left',
  className,
}: Props) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 pb-8 border-b border-border',
        align === 'center' && 'items-center text-center',
        className
      )}
    >
      <div
        className={cn(
          'flex items-baseline gap-3',
          align === 'center' && 'justify-center'
        )}
      >
        {number && <Eyebrow>{number}</Eyebrow>}
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      </div>
      <h2 className="font-heading text-[clamp(40px,6vw,80px)] uppercase leading-[0.95]">
        {title}
      </h2>
      {lede && (
        <p
          className={cn(
            'font-body normal-case text-base lg:text-lg text-muted-foreground leading-relaxed max-w-2xl',
            align === 'center' && 'mx-auto'
          )}
        >
          {lede}
        </p>
      )}
    </header>
  );
}
