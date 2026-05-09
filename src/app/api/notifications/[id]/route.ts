import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getNotificationContextFromRequest } from '@/lib/notifications/notification-access';
import { isNotificationVisibleForActiveRole } from '@/lib/notifications/visibility';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const context = await getNotificationContextFromRequest(req);
  if (!context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notification = await prisma.notification.findUnique({
    where: { id: params.id },
    select: { userId: true, type: true, url: true, readAt: true },
  });
  if (
    !notification ||
    notification.userId !== context.userId ||
    !isNotificationVisibleForActiveRole(notification, context.activeRole)
  ) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (notification.readAt) {
    return NextResponse.json({ ok: true });
  }
  await prisma.notification.update({
    where: { id: params.id },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
