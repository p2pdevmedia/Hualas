'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { LanguageProvider } from './language-provider';
import InstallPrompt from './pwa/install-prompt';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        {children}
        <InstallPrompt />
      </LanguageProvider>
    </SessionProvider>
  );
}
