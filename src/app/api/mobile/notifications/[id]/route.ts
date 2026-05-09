import { NextResponse } from 'next/server';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import { isNotificationVisibleForActiveRole } from '@/lib/notifications/visibility';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(req: Request, context: RouteContext) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = context.params;
  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { id: true, userId: true, type: true, url: true, readAt: true },
  });

  if (
    !notification ||
    notification.userId !== session.userId ||
    !isNotificationVisibleForActiveRole(notification, session.appRole)
  ) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!notification.readAt) {
    await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
