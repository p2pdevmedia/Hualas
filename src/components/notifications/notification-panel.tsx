'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { NotificationType } from '@prisma/client';
import NotificationItem from './notification-item';

export type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
};

type Props = {
  notifications: NotificationRow[];
  loading: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
  onItemRead: (id: string) => void;
};

export default function NotificationPanel({
  notifications,
  loading,
  onClose,
  onMarkAllRead,
  onItemRead,
}: Props) {
  const router = useRouter();
  const hasUnread = notifications.some((n) => !n.readAt);

  function handleItemClick(id: string, url: string | null) {
    onItemRead(id);
    onClose();
    if (url) router.push(url);
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900">
          Notificaciones
        </span>
        {hasUnread && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="text-xs text-blue-600 hover:underline"
          >
            Marcar todas como leídas
          </button>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
        {loading ? (
          <div className="px-3 py-6 text-center text-sm text-gray-500">
            Cargando…
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-gray-500">
            No tenés notificaciones.
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              id={n.id}
              type={n.type}
              title={n.title}
              body={n.body}
              url={n.url}
              readAt={n.readAt ? new Date(n.readAt) : null}
              createdAt={new Date(n.createdAt)}
              onClick={handleItemClick}
            />
          ))
        )}
      </div>
      <div className="border-t border-gray-100 px-3 py-2 text-center">
        <Link
          href="/profile/notifications"
          onClick={onClose}
          className="text-xs text-gray-600 hover:text-blue-600"
        >
          Preferencias de notificaciones
        </Link>
      </div>
    </div>
  );
}
