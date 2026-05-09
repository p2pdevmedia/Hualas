import { NextResponse } from 'next/server';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import { filterNotificationsForActiveRole } from '@/lib/notifications/visibility';

export async function GET(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get('unread') === '1';
  const limitRaw = Number.parseInt(url.searchParams.get('limit') ?? '20', 10);
  const limit = Math.min(
    Math.max(Number.isFinite(limitRaw) ? limitRaw : 20, 1),
    50
  );

  const [notificationRows, unreadRows] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId: session.userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
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
      where: { userId: session.userId, readAt: null },
      select: { type: true, url: true },
    }),
  ]);

  const notifications = filterNotificationsForActiveRole(
    notificationRows,
    session.appRole
  ).slice(0, limit);
  const visibleUnreadRows = filterNotificationsForActiveRole(
    unreadRows,
    session.appRole
  );
  const unreadCount = visibleUnreadRows.length;
  const chatUnreadCount = visibleUnreadRows.filter(
    (notification) => notification.type === 'CHAT_MESSAGE_NEW'
  ).length;

  return NextResponse.json({
    notifications: notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      url: notification.url,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    })),
    unreadCount,
    chatUnreadCount,
  });
}

export async function PATCH(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const unreadRows = await prisma.notification.findMany({
    where: { userId: session.userId, readAt: null },
    select: { id: true, type: true, url: true },
  });
  const visibleIds = filterNotificationsForActiveRole(
    unreadRows,
    session.appRole
  ).map((notification) => notification.id);

  if (visibleIds.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const result = await prisma.notification.updateMany({
    where: { userId: session.userId, id: { in: visibleIds }, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ updated: result.count });
}
