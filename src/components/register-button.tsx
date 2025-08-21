'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { useTranslation } from './language-provider';

interface Props {
  href?: string;
  onClick?: () => void;
}

export default function RegisterButton({ href, onClick }: Props) {
  const t = useTranslation();
  const btn = <Button onClick={onClick}>{t.nav.register}</Button>;
  if (href) {
    return <Link href={href}>{btn}</Link>;
  }
  return btn;
}
