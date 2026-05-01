'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useSession } from 'next-auth/react';
import NotificationPanel, {
  type NotificationRow,
} from './notification-panel';

const POLL_INTERVAL_MS = 60_000;

type ApiResponse = {
  notifications: NotificationRow[];
  unreadCount: number;
};

export default function NotificationBell() {
  const { status } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=10');
      if (!res.ok) return;
      const data = (await res.json()) as ApiResponse;
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore network errors
    }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    fetchData();
    const interval = window.setInterval(fetchData, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [status, fetchData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    function handleSwMessage(event: MessageEvent) {
      if (event.data && event.data.type === 'push-received') {
        fetchData();
      }
    }
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    };
  }, [fetchData]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleToggle() {
    if (!open) {
      setLoading(true);
      await fetchData();
      setLoading(false);
    }
    setOpen((prev) => !prev);
  }

  async function handleItemRead(id: string) {
    setItems((prev) =>
      prev.map((n) =>
        n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
    } catch {
      // ignore
    }
  }

  async function handleMarkAllRead() {
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((n) => (n.readAt ? n : { ...n, readAt: now })),
    );
    setUnreadCount(0);
    try {
      await fetch('/api/notifications', { method: 'PATCH' });
    } catch {
      // ignore
    }
  }

  if (status !== 'authenticated') return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 transition-colors"
        aria-label="Notificaciones"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-4 h-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <NotificationPanel
          notifications={items}
          loading={loading}
          onClose={() => setOpen(false)}
          onMarkAllRead={handleMarkAllRead}
          onItemRead={handleItemRead}
        />
      )}
    </div>
  );
}
