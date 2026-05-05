'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Download, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
};

const DISMISSED_KEY = 'hualasInstallPromptDismissedAt';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function InstallPrompt() {
  const { status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissedAt, setDismissedAt] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined') return;

    const ua = window.navigator.userAgent || '';
    const ios = /iPhone|iPad|iPod/.test(ua);
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    setIsIos(ios);
    setIsStandalone(standalone);

    try {
      const saved = window.localStorage.getItem(DISMISSED_KEY);
      if (saved) {
        setDismissedAt(Number(saved) || 0);
      }
    } catch {
      setDismissedAt(0);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setVisible(false);
      setPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!mounted || status !== 'authenticated' || isStandalone) {
      setVisible(false);
      return;
    }

    const canShowIosHint = isIos;
    const canShowInstallButton = !!promptEvent;
    const dismissedRecently =
      dismissedAt > 0 && Date.now() - dismissedAt < SEVEN_DAYS_MS;

    if (dismissedRecently) {
      setVisible(false);
      return;
    }

    setVisible(canShowIosHint || canShowInstallButton);
  }, [dismissedAt, isIos, isStandalone, mounted, promptEvent, status]);

  async function handleInstall() {
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
          setVisible(false);
          setPromptEvent(null);
          return;
        }
      } catch (err) {
        console.error('[install-prompt] install flow failed', err);
      }
    }

    handleDismiss();
  }

  function handleDismiss() {
    setVisible(false);
    try {
      const now = Date.now();
      window.localStorage.setItem(DISMISSED_KEY, now.toString());
      setDismissedAt(now);
    } catch {
      setDismissedAt(Date.now());
    }
  }

  if (!mounted || !visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-background/95 p-4 shadow-2xl supports-[backdrop-filter]:bg-background/90">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Smartphone className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Instalá Hualas para recibir notificaciones
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Agregá la app a tu dispositivo para que los avisos lleguen
                    mejor en Android, iPhone y PC.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {isIos && (
                <div className="mt-3 rounded-xl bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
                  En iPhone: tocá el botón de compartir del navegador y elegí{' '}
                  <span className="font-medium text-foreground">
                    Agregar a pantalla de inicio
                  </span>
                  .
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={handleDismiss}
              type="button"
              className="w-full sm:w-auto"
            >
              Después
            </Button>
            <Button
              onClick={handleInstall}
              type="button"
              className="w-full gap-2 sm:w-auto"
            >
              {promptEvent ? (
                <>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Instalar app
                </>
              ) : (
                'Entendido'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
