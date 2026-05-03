'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { LanguageProvider } from './language-provider';
import InstallPrompt from './pwa/install-prompt';
import { NotificationsProvider } from './notifications/notifications-context';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <NotificationsProvider>
          {children}
          <InstallPrompt />
        </NotificationsProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}
