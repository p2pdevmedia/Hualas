import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getNotificationContextFromRequest } from '@/lib/notifications/notification-access';
import { filterNotificationsForActiveRole } from '@/lib/notifications/visibility';

export async function GET(req: Request) {
  const context = await getNotificationContextFromRequest(req);
  if (!context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get('unread') === '1';
  const limitRaw = parseInt(url.searchParams.get('limit') ?? '20', 10);
  const limit = Math.min(
    Math.max(Number.isFinite(limitRaw) ? limitRaw : 20, 1),
    50
  );

  const [notificationRows, unreadRows] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId: context.userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        url: true,
        data: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.findMany({
      where: { userId: context.userId, readAt: null },
      select: { type: true, url: true },
    }),
  ]);

  const notifications = filterNotificationsForActiveRole(
    notificationRows,
    context.activeRole
  ).slice(0, limit);
  const visibleUnreadRows = filterNotificationsForActiveRole(
    unreadRows,
    context.activeRole
  );
  const unreadCount = visibleUnreadRows.length;
  const chatUnreadCount = visibleUnreadRows.filter(
    (notification) => notification.type === 'CHAT_MESSAGE_NEW'
  ).length;

  return NextResponse.json({ notifications, unreadCount, chatUnreadCount });
}

export async function PATCH(req: Request) {
  const context = await getNotificationContextFromRequest(req);
  if (!context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const unreadRows = await prisma.notification.findMany({
    where: { userId: context.userId, readAt: null },
    select: { id: true, type: true, url: true },
  });
  const visibleIds = filterNotificationsForActiveRole(
    unreadRows,
    context.activeRole
  ).map((notification) => notification.id);

  if (visibleIds.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const result = await prisma.notification.updateMany({
    where: { userId: context.userId, id: { in: visibleIds }, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ updated: result.count });
}
