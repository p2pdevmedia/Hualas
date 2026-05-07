import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getNotificationUserIdFromRequest } from '@/lib/notifications/notification-access';

export async function GET(req: Request) {
  const userId = await getNotificationUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get('unread') === '1';
  const limitRaw = parseInt(url.searchParams.get('limit') ?? '20', 10);
  const limit = Math.min(
    Math.max(Number.isFinite(limitRaw) ? limitRaw : 20, 1),
    50
  );

  const [notifications, unreadCount, chatUnreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
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
    prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.notification.count({
      where: { userId, readAt: null, type: 'CHAT_MESSAGE_NEW' },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount, chatUnreadCount });
}

export async function PATCH(req: Request) {
  const userId = await getNotificationUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ updated: result.count });
}
