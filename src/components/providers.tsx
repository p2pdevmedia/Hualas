'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { LanguageProvider } from './language-provider';
import { ThemeProvider } from './theme-provider';
import { Toaster } from './ui/toaster';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <SessionProvider>
        <LanguageProvider>
          {children}
          <Toaster />
        </LanguageProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
