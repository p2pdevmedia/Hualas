import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const subscription = await prisma.pushAlertSubscription.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });
  if (!subscription || subscription.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await prisma.pushAlertSubscription.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
