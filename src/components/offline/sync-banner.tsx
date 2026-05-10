'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  flushPendingMutations,
  countPendingMutations,
} from '@/lib/offline/pending-mutations';

export default function SyncBanner() {
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const justSyncedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshCount = useCallback(async () => {
    const count = await countPendingMutations();
    setPendingCount(count);
  }, []);

  const sync = useCallback(async () => {
    const pending = await countPendingMutations();
    setPendingCount(pending);
    if (pending === 0) return;

    setSyncing(true);
    try {
      const { ok } = await flushPendingMutations();
      await refreshCount();
      if (ok > 0) {
        window.dispatchEvent(new CustomEvent('hualas-mutations-synced'));
        setJustSynced(true);
        if (justSyncedTimer.current) clearTimeout(justSyncedTimer.current);
        justSyncedTimer.current = setTimeout(() => setJustSynced(false), 3000);
      }
    } finally {
      setSyncing(false);
    }
  }, [refreshCount]);

  useEffect(() => {
    setMounted(true);
    const online = navigator.onLine;
    setIsOnline(online);
    if (online) void sync();
    else void refreshCount();

    const onOnline = () => {
      setIsOnline(true);
      void sync();
    };
    const onOffline = () => {
      setIsOnline(false);
      void refreshCount();
    };
    const onQueued = () => void refreshCount();

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('hualas-mutation-queued', onQueued);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('hualas-mutation-queued', onQueued);
      if (justSyncedTimer.current) clearTimeout(justSyncedTimer.current);
    };
  }, [sync, refreshCount]);

  if (!mounted) return null;

  if (!isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 inset-x-0 z-50 bg-foreground text-background text-xs font-medium text-center py-1.5 px-4"
      >
        Sin conexión
        {pendingCount > 0
          ? ` · ${pendingCount} cambio${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''}`
          : ''}
      </div>
    );
  }

  if (syncing) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 inset-x-0 z-50 bg-foreground text-background text-xs font-medium text-center py-1.5 px-4"
      >
        Sincronizando cambios…
      </div>
    );
  }

  if (justSynced) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 inset-x-0 z-50 bg-green-600 text-white text-xs font-medium text-center py-1.5 px-4"
      >
        Cambios sincronizados ✓
      </div>
    );
  }

  return null;
}
