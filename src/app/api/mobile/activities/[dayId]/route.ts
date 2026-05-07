import { NextResponse } from 'next/server';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';

function formatDateOnly(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

export async function GET(
  req: Request,
  { params }: { params: { dayId: string } }
) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const day = await prisma.activityDay.findUnique({
    where: { id: params.dayId },
    select: {
      id: true,
      activityId: true,
      date: true,
      schedule: true,
      geoLocation: true,
      description: true,
      planificacion: true,
      devolucion: true,
      cancelled: true,
      cancellationReason: true,
      activityGroupId: true,
      activity: {
        select: {
          id: true,
          name: true,
          price: true,
        },
      },
      activityGroup: { select: { id: true, name: true } },
      professors: {
        select: {
          userId: true,
          user: { select: { name: true, lastName: true, phone: true } },
        },
      },
      attendances: {
        select: {
          status: true,
          confirmedAt: true,
          activityParticipantId: true,
          activityParticipant: {
            select: {
              id: true,
              userId: true,
              childId: true,
              child: { select: { name: true, lastName: true } },
              user: { select: { name: true, lastName: true } },
              groupMembership: {
                select: {
                  activityGroupId: true,
                  activityGroup: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!day) {
    return NextResponse.json({ error: 'Día no encontrado' }, { status: 404 });
  }

  const canSeeActivity =
    session.appRole === 'PROFESSOR'
      ? (await prisma.activityProfessor.count({
          where: {
            userId: session.userId,
            activityId: day.activityId,
          },
        })) > 0 || day.professors.some((assignment) => assignment.userId === session.userId)
      : false;

  const accessibleChildOwnerIds =
    session.appRole === 'MEMBER'
      ? await getAccessibleChildOwnerIds(session.userId)
      : [];

  const memberParticipants =
    session.appRole === 'MEMBER'
      ? await prisma.activityParticipant.findMany({
          where: {
            activityId: day.activityId,
            OR: [
              { userId: session.userId },
              { child: { userId: { in: accessibleChildOwnerIds } } },
            ],
          },
          select: {
            id: true,
            userId: true,
            childId: true,
            child: { select: { name: true, lastName: true } },
            user: { select: { name: true, lastName: true } },
            groupMembership: {
              select: {
                activityGroupId: true,
                activityGroup: { select: { name: true } },
              },
            },
          },
        })
      : [];

  const activityScope = {
    groupIds: new Set(
      memberParticipants
        .map((participant) => participant.groupMembership?.activityGroupId)
        .filter((value): value is string => Boolean(value))
    ),
  };

  const memberCanSeeDay =
    session.appRole !== 'MEMBER'
      ? false
      : day.activityGroupId === null
      ? true
      : activityScope.groupIds.has(day.activityGroupId);

  if (session.appRole === 'PROFESSOR' && !canSeeActivity) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (session.appRole === 'MEMBER' && !memberCanSeeDay) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const participants =
    session.appRole === 'PROFESSOR'
      ? day.attendances.map((attendance) => ({
          id: attendance.activityParticipant.id,
          userId: attendance.activityParticipant.userId,
          childId: attendance.activityParticipant.childId,
          label: attendance.activityParticipant.child
            ? `${attendance.activityParticipant.child.name}${attendance.activityParticipant.child.lastName ? ` ${attendance.activityParticipant.child.lastName}` : ''}`
            : `${attendance.activityParticipant.user.name ?? 'Sin nombre'}${attendance.activityParticipant.user.lastName ? ` ${attendance.activityParticipant.user.lastName}` : ''}`,
          groupName:
            attendance.activityParticipant.groupMembership?.activityGroup?.name ??
            null,
          attendance: {
            status: attendance.status,
            confirmedAt: attendance.confirmedAt
              ? formatDateOnly(attendance.confirmedAt)
              : null,
          },
        }))
      : memberParticipants.map((participant) => {
          const attendance = day.attendances.find(
            (item) => item.activityParticipantId === participant.id
          );

          return {
            id: participant.id,
            userId: participant.userId,
            childId: participant.childId,
            label: participant.child
              ? `${participant.child.name}${participant.child.lastName ? ` ${participant.child.lastName}` : ''}`
              : `${participant.user.name ?? 'Sin nombre'}${participant.user.lastName ? ` ${participant.user.lastName}` : ''}`,
            groupName:
              participant.groupMembership?.activityGroup?.name ?? null,
            attendance: {
              status: attendance?.status ?? 'PENDING',
              confirmedAt: attendance?.confirmedAt
                ? formatDateOnly(attendance.confirmedAt)
                : null,
            },
          };
        });

  return NextResponse.json({
    role: session.appRole,
    day: {
      id: day.id,
      date: formatDateOnly(day.date),
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
    professors: day.professors.map((assignment) => ({
      id: assignment.userId,
      label: `${assignment.user.name ?? 'Sin nombre'}${assignment.user.lastName ? ` ${assignment.user.lastName}` : ''}`,
      phone: assignment.user.phone,
    })),
    participants,
  });
}
