import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return null;
  }

  return session;
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; childId: string } }
) {
  const session = await ensureAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const child = await prisma.child.findFirst({
    where: {
      id: params.childId,
      userId: params.id,
    },
    select: {
      id: true,
      name: true,
      lastName: true,
    },
  });

  if (!child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.activityParticipant.deleteMany({
      where: {
        childId: params.childId,
        userId: params.id,
      },
    }),
    prisma.child.delete({
      where: {
        id: params.childId,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    child: {
      id: child.id,
      name: child.name,
      lastName: child.lastName,
    },
  });
}
