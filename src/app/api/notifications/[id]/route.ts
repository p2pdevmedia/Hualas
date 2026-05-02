import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

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
