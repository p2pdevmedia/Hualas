'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { LanguageProvider } from '@/lib/language-context';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </SessionProvider>
  );
}

