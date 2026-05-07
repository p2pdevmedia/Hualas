import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getNotificationUserIdFromRequest } from '@/lib/notifications/notification-access';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getNotificationUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notification = await prisma.notification.findUnique({
    where: { id: params.id },
    select: { userId: true, readAt: true },
  });
  if (!notification || notification.userId !== userId) {
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
