import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: Request,
  { params }: { params: { dayId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const day = await prisma.activityDay.findUnique({
    where: { id: params.dayId },
    include: { professors: { select: { userId: true } } },
  });

  if (!day) {
    return NextResponse.json({ error: 'Día no encontrado' }, { status: 404 });
  }

  const isAdmin =
    session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
  const isProfessorOfDay =
    session.user.role === 'PROFESSOR' &&
    day.professors.some((p) => p.userId === session.user.id);

  if (!isAdmin && !isProfessorOfDay) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const cancelled = Boolean(body.cancelled);
  const cancellationReason =
    cancelled && typeof body.cancellationReason === 'string'
      ? body.cancellationReason || null
      : null;

  const updatedDay = await prisma.activityDay.update({
    where: { id: day.id },
    data: { cancelled, cancellationReason },
  });

  return NextResponse.json(updatedDay);
}
