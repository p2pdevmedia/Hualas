'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { LanguageProvider } from './language-provider';
import InstallPrompt from './pwa/install-prompt';
import { NotificationsProvider } from './notifications/notifications-context';
import SyncBanner from './offline/sync-banner';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <NotificationsProvider>
          <SyncBanner />
          {children}
          <InstallPrompt />
        </NotificationsProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}
