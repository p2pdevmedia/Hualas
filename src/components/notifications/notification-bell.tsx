'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import NotificationPanel from './notification-panel';
import { useNotifications } from './notifications-context';

export default function NotificationBell() {
  const { status } = useSession();
  const { items, unreadCount, fetchData, markRead, markAllRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
        <Image
          src="/Notificacion.png"
          alt="Notificaciones"
          width={25}
          height={25}
          unoptimized
        />
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
          unreadCount={unreadCount}
          onClose={() => setOpen(false)}
          onMarkAllRead={markAllRead}
          onItemRead={markRead}
        />
      )}
    </div>
  );
}
