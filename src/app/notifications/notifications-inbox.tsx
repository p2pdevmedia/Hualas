'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, ExternalLink, Inbox } from 'lucide-react';
import type { NotificationRow } from '@/components/notifications/notification-panel';
import { useNotifications } from '@/components/notifications/notifications-context';
import { cn } from '@/lib/utils';

type Props = {
  initialNotifications: NotificationRow[];
  initialUnreadCount: number;
};

function formatInboxDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function NotificationsInbox({
  initialNotifications,
  initialUnreadCount,
}: Props) {
  const router = useRouter();
  const { markAllRead, fetchData } = useNotifications();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [selectedId, setSelectedId] = useState('');
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () =>
      notifications.find((notification) => notification.id === selectedId) ??
      null,
    [notifications, selectedId]
  );

  async function markNotificationRead(id: string) {
    const target = notifications.find((notification) => notification.id === id);
    if (!target || target.readAt) return;

    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, readAt } : notification
      )
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      await fetchData();
    } catch {
      // Se mantiene el estado optimista; el próximo refresco corrige diferencias.
    }
  }

  async function handleSelect(notification: NotificationRow) {
    setSelectedId(notification.id);
    await markNotificationRead(notification.id);
  }

  async function handleOpen(notification: NotificationRow) {
    await markNotificationRead(notification.id);
    if (notification.url) {
      router.push(notification.url);
    }
  }

  async function handleMarkAllRead() {
    setSaving(true);
    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((notification) =>
        notification.readAt ? notification : { ...notification, readAt }
      )
    );
    setUnreadCount(0);
    try {
      await markAllRead();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 text-blue-700">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Bandeja de entrada
            </h2>
            <p className="text-sm text-gray-600">
              {notifications.length === 0
                ? 'No hay notificaciones para mostrar.'
                : `${notifications.length} notificación${notifications.length === 1 ? '' : 'es'} · ${unreadCount} sin leer`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/profile/notifications"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Preferencias
          </Link>
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || saving}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <CheckCheck className="h-4 w-4" />
            Marcar todas como leídas
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="grid min-h-80 place-items-center px-4 py-12 text-center">
          <div>
            <Bell className="mx-auto h-10 w-10 text-gray-300" />
            <h3 className="mt-3 text-lg font-semibold text-gray-900">
              No tenés notificaciones
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Cuando haya novedades del club, van a aparecer acá.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid min-h-[32rem] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
          <div className="max-h-[42rem] overflow-y-auto border-b border-gray-200 lg:border-b-0 lg:border-r">
            {notifications.map((notification) => {
              const isUnread = !notification.readAt;
              const isSelected = notification.id === selectedId;
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void handleSelect(notification)}
                  className={cn(
                    'flex w-full gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-blue-50/60',
                    isSelected && 'bg-blue-50',
                    isUnread && !isSelected && 'bg-white'
                  )}
                >
                  <span
                    className={cn(
                      'mt-2 h-2.5 w-2.5 shrink-0 rounded-full',
                      isUnread
                        ? 'bg-red-500'
                        : 'bg-transparent ring-1 ring-gray-300'
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          'truncate text-sm',
                          isUnread
                            ? 'font-semibold text-gray-950'
                            : 'font-medium text-gray-700'
                        )}
                      >
                        {notification.title}
                      </span>
                      <span className="shrink-0 text-[11px] text-gray-500">
                        {formatInboxDate(notification.createdAt)}
                      </span>
                    </span>
                    <span className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                      {notification.body}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-5 lg:p-6">
            {selected ? (
              <article className="flex h-full flex-col">
                <div className="mb-4 flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      {!selected.readAt && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          Sin leer
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatInboxDate(selected.createdAt)}
                      </span>
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-950">
                      {selected.title}
                    </h3>
                  </div>
                  {selected.url && (
                    <button
                      type="button"
                      onClick={() => void handleOpen(selected)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
                    >
                      Abrir aviso
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-line text-sm leading-7 text-gray-700">
                  {selected.body}
                </p>
                {!selected.url && (
                  <p className="mt-6 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500">
                    Esta notificación no tiene una página asociada. Ya quedó
                    marcada como leída al seleccionarla.
                  </p>
                )}
              </article>
            ) : (
              <div className="grid h-full min-h-80 place-items-center text-center text-gray-500">
                Seleccioná una notificación para leerla.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
