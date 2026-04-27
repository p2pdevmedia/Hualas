'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { LanguageProvider } from './language-provider';
import { Toaster } from './ui/toaster';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        {children}
        <Toaster />
      </LanguageProvider>
    </SessionProvider>
  );
}
