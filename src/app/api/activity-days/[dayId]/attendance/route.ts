import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import { activityDayAttendanceSchema } from '@/lib/validations/activity';
import { isUserAssignedToActivityDay } from '@/lib/activity-day-professors';

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
      activityGroupId: true,
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
      groupMembership: {
        select: {
          activityGroupId: true,
        },
      },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isSelf = participant.userId === session.user.id;
  const accessibleChildOwnerIds = await getAccessibleChildOwnerIds(
    session.user.id
  );
  const canManageChild = participant.child?.userId
    ? accessibleChildOwnerIds.includes(participant.child.userId)
    : false;

  if (!isSelf && !canManageChild) {
    const professorAssigned = await isUserAssignedToActivityDay(
      day.id,
      session.user.id
    );
    if (!professorAssigned) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (participant.activityId !== day.activityId) {
    return NextResponse.json(
      { error: 'El inscripto no pertenece a esta actividad' },
      { status: 400 }
    );
  }

  if (
    day.activityGroupId &&
    participant.groupMembership?.activityGroupId !== day.activityGroupId
  ) {
    return NextResponse.json(
      { error: 'El día está restringido a otro grupo' },
      { status: 403 }
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
