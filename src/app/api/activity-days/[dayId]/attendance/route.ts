import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activityDayAttendanceSchema } from '@/lib/validations/activity';

export async function PATCH(
  req: Request,
  { params }: { params: { dayId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = activityDayAttendanceSchema.parse(await req.json());
  const day = await prisma.activityDay.findUnique({
    where: { id: params.dayId },
    select: {
      id: true,
      activityId: true,
    },
  });

  if (!day) {
    return NextResponse.json({ error: 'Día no encontrado' }, { status: 404 });
  }

  const participant = await prisma.activityParticipant.findUnique({
    where: { id: data.participantId },
    select: {
      id: true,
      userId: true,
      activityId: true,
      child: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!participant || participant.userId !== session.user.id) {
    const childUserId = participant?.child?.userId;
    if (!participant || childUserId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (participant.activityId !== day.activityId) {
    return NextResponse.json(
      { error: 'El inscripto no pertenece a esta actividad' },
      { status: 400 }
    );
  }

  const attendance = await prisma.activityDayAttendance.upsert({
    where: {
      activityDayId_activityParticipantId: {
        activityDayId: day.id,
        activityParticipantId: data.participantId,
      },
    },
    create: {
      activityDayId: day.id,
      activityParticipantId: data.participantId,
      status: data.status,
      confirmedAt: data.status === 'PENDING' ? null : new Date(),
    },
    update: {
      status: data.status,
      confirmedAt: data.status === 'PENDING' ? null : new Date(),
    },
  });

  return NextResponse.json(attendance);
}
