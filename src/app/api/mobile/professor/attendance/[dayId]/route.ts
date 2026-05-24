import { NextResponse } from 'next/server';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { formatFullName, formatMobileDateOnly } from '@/lib/mobile-format';
import { prisma } from '@/lib/prisma';
import { activityDayAttendanceSchema } from '@/lib/validations/activity';

export async function GET(
  req: Request,
  { params }: { params: { dayId: string } }
) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.appRole !== 'PROFESSOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const day = await prisma.activityDay.findFirst({
    where: {
      id: params.dayId,
      OR: [
        { activityGroup: { professors: { some: { userId: session.userId } } } },
        {
          activityGroupId: null,
          activity: { professors: { some: { userId: session.userId } } },
        },
      ],
    },
    select: {
      id: true,
      date: true,
      schedule: true,
      geoLocation: true,
      description: true,
      planificacion: true,
      devolucion: true,
      cancelled: true,
      cancellationReason: true,
      activityGroupId: true,
      activity: { select: { id: true, name: true } },
      activityGroup: { select: { id: true, name: true } },
      attendances: {
        select: {
          id: true,
          activityParticipantId: true,
          status: true,
          confirmedAt: true,
          activityParticipant: {
            select: {
              id: true,
              userId: true,
              child: { select: { name: true, lastName: true } },
              user: { select: { name: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  if (!day) {
    return NextResponse.json({ error: 'Día no encontrado' }, { status: 404 });
  }

  const participants = await prisma.activityParticipant.findMany({
    where: {
      activityId: day.activity.id,
      status: 'ACTIVE',
      ...(day.activityGroupId
        ? {
            groupMembership: {
              activityGroupId: day.activityGroupId,
            },
          }
        : {}),
    },
    select: {
      id: true,
      userId: true,
      child: { select: { name: true, lastName: true } },
      user: { select: { name: true, lastName: true } },
      groupMembership: {
        select: {
          activityGroupId: true,
          activityGroup: { select: { name: true } },
        },
      },
    },
    orderBy: [{ child: { name: 'asc' } }, { user: { name: 'asc' } }],
  });

  const attendanceByParticipantId = new Map(
    day.attendances.map((attendance) => [
      attendance.activityParticipantId,
      attendance,
    ])
  );

  return NextResponse.json({
    day: {
      id: day.id,
      date: formatMobileDateOnly(day.date),
      schedule: day.schedule,
      geoLocation: day.geoLocation,
      description: day.description,
      planificacion: day.planificacion,
      devolucion: day.devolucion,
      cancelled: day.cancelled,
      cancellationReason: day.cancellationReason,
      activity: day.activity,
      groupName: day.activityGroup?.name ?? null,
    },
    participants: participants.map((participant) => {
      const attendance = attendanceByParticipantId.get(participant.id);
      return {
        id: participant.id,
        userId: participant.userId,
        label: participant.child
          ? formatFullName(participant.child)
          : formatFullName(participant.user),
        groupName: participant.groupMembership?.activityGroup?.name ?? null,
        attendance: attendance
          ? {
              id: attendance.id,
              status: attendance.status,
              confirmedAt: formatMobileDateOnly(attendance.confirmedAt),
            }
          : {
              id: null,
              status: 'PENDING',
              confirmedAt: null,
            },
      };
    }),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { dayId: string } }
) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.appRole !== 'PROFESSOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const day = await prisma.activityDay.findFirst({
    where: {
      id: params.dayId,
      OR: [
        { activityGroup: { professors: { some: { userId: session.userId } } } },
        {
          activityGroupId: null,
          activity: { professors: { some: { userId: session.userId } } },
        },
      ],
    },
    select: {
      id: true,
      activityId: true,
      activityGroupId: true,
    },
  });

  if (!day) {
    return NextResponse.json({ error: 'Día no encontrado' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = activityDayAttendanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const participant = await prisma.activityParticipant.findUnique({
    where: { id: parsed.data.participantId },
    select: {
      id: true,
      activityId: true,
      groupMembership: {
        select: { activityGroupId: true },
      },
    },
  });

  if (!participant) {
    return NextResponse.json(
      { error: 'Inscripto no encontrado' },
      { status: 404 }
    );
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
        activityParticipantId: parsed.data.participantId,
      },
    },
    create: {
      activityDayId: day.id,
      activityParticipantId: parsed.data.participantId,
      status: parsed.data.status,
      confirmedAt: parsed.data.status === 'PENDING' ? null : new Date(),
    },
    update: {
      status: parsed.data.status,
      confirmedAt: parsed.data.status === 'PENDING' ? null : new Date(),
    },
  });

  return NextResponse.json({
    attendance: {
      id: attendance.id,
      activityDayId: attendance.activityDayId,
      activityParticipantId: attendance.activityParticipantId,
      status: attendance.status,
      confirmedAt: formatMobileDateOnly(attendance.confirmedAt),
    },
  });
}
