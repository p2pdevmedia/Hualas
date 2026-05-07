import { NextResponse } from 'next/server';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';

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

  const [notifications, unreadCount, chatUnreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId: session.userId,
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
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { userId: session.userId, readAt: null },
    }),
    prisma.notification.count({
      where: {
        userId: session.userId,
        readAt: null,
        type: 'CHAT_MESSAGE_NEW',
      },
    }),
  ]);

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

  const result = await prisma.notification.updateMany({
    where: { userId: session.userId, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ updated: result.count });
}
