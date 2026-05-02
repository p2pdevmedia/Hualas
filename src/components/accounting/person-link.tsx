'use client';

import Link from 'next/link';
import type { MouseEventHandler, ReactNode } from 'react';

type PersonLinkProps = {
  href?: string | null;
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<any>;
};

export default function PersonLink({
  href,
  children,
  className = '',
  onClick,
}: PersonLinkProps) {
  if (!href) {
    return (
      <span className={className} onClick={onClick}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
