import Image from 'next/image';
import { cn } from '@/lib/utils';

type Props = {
  /** Diameter in px. Default 40. */
  size?: number;
  /** Override src (e.g. admin-uploaded logo from DB). */
  src?: string;
  /** Alt text. */
  alt?: string;
  className?: string;
  /** When src is a remote URL we don't control (e.g. Pinata gateway). */
  unoptimized?: boolean;
  priority?: boolean;
};

const LOCAL_LOGO = '/images/hualas/logo.jpeg';

/**
 * Hualas Patagónico circular brand mark.
 *
 * Defaults to the local asset; pass `src` to override (e.g. admin-set logo
 * from `settings.logo` via Pinata gateway).
 */
export default function HualasLogo({
  size = 40,
  src,
  alt = 'Hualas Patagónico — Escuela de Montaña',
  className,
  unoptimized,
  priority,
}: Props) {
  const finalSrc = src || LOCAL_LOGO;
  const isRemote = !!src;
  return (
    <Image
      src={finalSrc}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      unoptimized={unoptimized ?? isRemote}
      className={cn('rounded-full object-cover shrink-0', className)}
      style={{ width: size, height: size }}
    />
  );
}
