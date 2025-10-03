'use client';

import Link from 'next/link';
import { Button, buttonVariants } from './ui/button';
import { useTranslation } from './language-provider';
import { cn } from '@/lib/utils';

interface Props {
  href?: string;
  onClick?: () => void;
  label?: string;
}

export default function RegisterButton({ href, onClick, label }: Props) {
  const t = useTranslation();
  const text = label ?? t.nav.register;
  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          buttonVariants({ variant: 'primary', size: 'md' }),
          'shadow-lg shadow-emerald-500/30'
        )}
      >
        {text}
      </Link>
    );
  }
  const handleClick = () => {
    if (onClick) onClick();
  };
  return (
    <Button
      type="button"
      onClick={handleClick}
      className="shadow-lg shadow-emerald-500/30"
    >
      {text}
    </Button>
  );
}
