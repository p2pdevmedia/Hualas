'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

type PushAlertResult = {
  subscriber_id?: string;
  alreadySubscribed?: boolean;
  status?: number;
};

type PushAlertApi = {
  subs_id?: string;
};

const DISMISSED_KEY = 'pushAlertPromptDismissedAt';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

declare global {
  interface Window {
    pushalertbyiw?: Array<unknown[]>;
    PushAlertCo?: PushAlertApi;
  }
}

async function postSubscription(subscriberId: string): Promise<void> {
  await fetch('/api/notifications/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscriberId,
      userAgent: navigator.userAgent,
    }),
  });
}

export default function PushManager() {
  const { status } = useSession();
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (status !== 'authenticated') {
      setShowHint(false);
      return;
    }

    const dismissedAt = parseInt(
      window.localStorage.getItem(DISMISSED_KEY) ?? '0',
      10
    );
    if (dismissedAt && Date.now() - dismissedAt < SEVEN_DAYS_MS) {
      return;
    }

    const register = async (subscriberId?: string) => {
      if (!subscriberId) return;
      try {
        await postSubscription(subscriberId);
      } catch (err) {
        console.error('[push-manager] subscription sync failed', err);
      }
    };

    const queue = window.pushalertbyiw ?? [];
    window.pushalertbyiw = queue;
    queue.push([
      'onReady',
      () => {
        const current = window.PushAlertCo?.subs_id;
        if (current) {
          void register(current);
          return;
        }
        setShowHint(true);
      },
    ]);
    queue.push([
      'onSuccess',
      (result: PushAlertResult) => {
        void register(result.subscriber_id);
      },
    ]);
    queue.push([
      'onFailure',
      (result: PushAlertResult) => {
        if (
          result.status === -1 ||
          result.status === 0 ||
          result.status === 1
        ) {
          setShowHint(true);
        }
      },
    ]);

    const ready = window.PushAlertCo?.subs_id;
    if (ready) {
      void register(ready);
    }
  }, [status]);

  function handleDismiss() {
    setShowHint(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    } catch {}
  }

  if (!showHint) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
    <div className="w-full max-w-sm rounded-xl border bg-background p-4 shadow-lg">
      <div className="space-y-2">
        <p className="text-sm font-semibold">Activá PushAlert</p>
        <p className="text-sm text-muted-foreground">
          Cuando el navegador te muestre el permiso, aceptalo para recibir las
          notificaciones de Hualas.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            Después
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
