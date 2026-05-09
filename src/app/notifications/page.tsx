import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import NotificationsInbox from './notifications-inbox';
import { filterNotificationsForActiveRole } from '@/lib/notifications/visibility';
import type { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login?callbackUrl=/notifications');
  }

  const sessionUser = session.user as { id: string; activeRole?: Role | null };
  const userId = sessionUser.id;
  const activeRole = sessionUser.activeRole ?? null;

  const [notificationRows, unreadRows] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        url: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.findMany({
      where: { userId, readAt: null },
      select: { type: true, url: true },
    }),
  ]);

  const notifications = filterNotificationsForActiveRole(
    notificationRows,
    activeRole
  );
  const unreadCount = filterNotificationsForActiveRole(
    unreadRows,
    activeRole
  ).length;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-blue-700">
          Centro de notificaciones
        </p>
        <h1 className="text-3xl font-semibold text-gray-900">
          Tus notificaciones
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Revisá el historial completo de avisos del club, ordenado del más
          reciente al más antiguo, como una casilla de mail sencilla.
        </p>
      </div>

      <NotificationsInbox
        initialNotifications={notifications.map((notification) => ({
          ...notification,
          readAt: notification.readAt?.toISOString() ?? null,
          createdAt: notification.createdAt.toISOString(),
        }))}
        initialUnreadCount={unreadCount}
      />
    </main>
  );
}
