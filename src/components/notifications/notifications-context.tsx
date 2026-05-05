'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import type { NotificationRow } from './notification-panel';

const POLL_INTERVAL_MS = 15_000;

type NotificationsContextValue = {
  items: NotificationRow[];
  unreadCount: number;
  chatUnreadCount: number;
  fetchData: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      'useNotifications must be used inside NotificationsProvider'
    );
  return ctx;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=10');
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: NotificationRow[];
        unreadCount: number;
        chatUnreadCount: number;
      };
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
      setChatUnreadCount(data.chatUnreadCount);
    } catch {
      // ignore network errors
    }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') {
      setItems([]);
      setUnreadCount(0);
      setChatUnreadCount(0);
      return;
    }
    void fetchData();
    const interval = window.setInterval(fetchData, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [status, fetchData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    function handleSwMessage(event: MessageEvent) {
      if (event.data?.type === 'push-received') {
        void fetchData();
      }
    }
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () =>
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
  }, [fetchData]);

  const markRead = useCallback(
    async (id: string) => {
      const target = items.find((n) => n.id === id);
      setItems((prev) =>
        prev.map((n) =>
          n.id === id && !n.readAt
            ? { ...n, readAt: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      if (target?.type === 'CHAT_MESSAGE_NEW' && !target.readAt) {
        setChatUnreadCount((c) => Math.max(0, c - 1));
      }
      try {
        await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      } catch {
        // ignore
      }
    },
    [items]
  );

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    setUnreadCount(0);
    setChatUnreadCount(0);
    try {
      await fetch('/api/notifications', { method: 'PATCH' });
    } catch {
      // ignore
    }
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        items,
        unreadCount,
        chatUnreadCount,
        fetchData,
        markRead,
        markAllRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
