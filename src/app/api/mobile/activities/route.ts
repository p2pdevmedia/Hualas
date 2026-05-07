import { NextResponse } from 'next/server';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';

function parseMonthRange(value: string | null) {
  const now = new Date();
  const fallbackYear = now.getFullYear();
  const fallbackMonth = now.getMonth();

  const match = value?.match(/^(\d{4})-(\d{2})$/);
  const year = match ? Number(match[1]) : fallbackYear;
  const monthIndex = match ? Number(match[2]) - 1 : fallbackMonth;

  const start = new Date(year, monthIndex, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 1);
  end.setHours(0, 0, 0, 0);

  const monthLabel = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
  }).format(start);

  const monthKey = `${String(start.getFullYear())}-${String(
    start.getMonth() + 1
  ).padStart(2, '0')}`;

  return { start, end, monthKey, monthLabel };
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function formatDateOnly(value: Date) {
  return toDateKey(value);
}

function isVisibleForMember(
  day: { activityGroupId: string | null; activityId: string },
  scope:
    | {
        groupIds: Set<string>;
        hasUngroupedParticipant: boolean;
      }
    | undefined
) {
  if (day.activityGroupId === null) return true;
  if (!scope) return false;
  return scope.groupIds.has(day.activityGroupId);
}

export async function GET(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const { start, end, monthKey, monthLabel } = parseMonthRange(
    url.searchParams.get('month')
  );

  if (session.appRole === 'PROFESSOR') {
    const [activityAssignments, directDays] = await Promise.all([
      prisma.activityProfessor.findMany({
        where: { userId: session.userId },
        select: { activityId: true },
      }),
      prisma.activityDay.findMany({
        where: {
          date: { gte: start, lt: end },
          professors: { some: { userId: session.userId } },
        },
        select: {
          id: true,
          activityId: true,
          date: true,
          schedule: true,
          geoLocation: true,
          cancelled: true,
          activityGroupId: true,
          activity: { select: { id: true, name: true } },
          activityGroup: { select: { name: true } },
        },
        orderBy: [{ date: 'asc' }, { schedule: 'asc' }],
      }),
    ]);

    const assignedActivityIds = new Set(
      activityAssignments.map((assignment) => assignment.activityId)
    );

    const assignedDays = assignedActivityIds.size
      ? await prisma.activityDay.findMany({
          where: {
            date: { gte: start, lt: end },
            activityId: { in: [...assignedActivityIds] },
          },
          select: {
            id: true,
            activityId: true,
            date: true,
            schedule: true,
            geoLocation: true,
            cancelled: true,
            activityGroupId: true,
            activity: { select: { id: true, name: true } },
            activityGroup: { select: { name: true } },
          },
          orderBy: [{ date: 'asc' }, { schedule: 'asc' }],
        })
      : [];

    const merged = new Map<string, (typeof directDays)[number]>();
    [...assignedDays, ...directDays].forEach((day) => merged.set(day.id, day));

    const sessions = [...merged.values()]
      .sort((a, b) => {
        const diff = a.date.getTime() - b.date.getTime();
        if (diff !== 0) return diff;
        return a.schedule.localeCompare(b.schedule);
      })
      .map((day) => ({
        id: day.id,
        date: formatDateOnly(day.date),
        activityId: day.activity.id,
        activityName: day.activity.name,
        schedule: day.schedule,
        geoLocation: day.geoLocation,
        groupName: day.activityGroup?.name ?? null,
        activityGroupId: day.activityGroupId,
        cancelled: day.cancelled,
      }));

    return NextResponse.json({
      role: 'PROFESSOR',
      month: monthKey,
      monthLabel,
      sessions,
    });
  }

  const accessibleChildOwnerIds = await getAccessibleChildOwnerIds(
    session.userId
  );
  const participations = await prisma.activityParticipant.findMany({
    where: {
      OR: [
        { userId: session.userId },
        { child: { userId: { in: accessibleChildOwnerIds } } },
      ],
    },
    select: {
      activityId: true,
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
  });

  const activityIds = [...new Set(participations.map((p) => p.activityId))];
  const scopeByActivityId = new Map<
    string,
    { groupIds: Set<string>; hasUngroupedParticipant: boolean }
  >();

  for (const participation of participations) {
    const current = scopeByActivityId.get(participation.activityId) ?? {
      groupIds: new Set<string>(),
      hasUngroupedParticipant: false,
    };

    const groupId = participation.groupMembership?.activityGroupId ?? null;
    if (groupId) {
      current.groupIds.add(groupId);
    } else {
      current.hasUngroupedParticipant = true;
    }

    scopeByActivityId.set(participation.activityId, current);
  }

  const days = activityIds.length
    ? await prisma.activityDay.findMany({
        where: {
          date: { gte: start, lt: end },
          activityId: { in: activityIds },
        },
        select: {
          id: true,
          activityId: true,
          date: true,
          schedule: true,
          geoLocation: true,
          cancelled: true,
          activityGroupId: true,
          activity: { select: { id: true, name: true } },
          activityGroup: { select: { name: true } },
        },
        orderBy: [{ date: 'asc' }, { schedule: 'asc' }],
      })
    : [];

  const sessions = days
    .filter((day) =>
      isVisibleForMember(day, scopeByActivityId.get(day.activityId))
    )
    .map((day) => {
      const visibleParticipants = participations.filter((participant) => {
        if (participant.activityId !== day.activityId) return false;

        if (day.activityGroupId === null) return true;

        const participantGroupId =
          participant.groupMembership?.activityGroupId ?? null;
        return participantGroupId === day.activityGroupId;
      });

      const participantLabels = [
        ...new Set(
          visibleParticipants.map((participant) =>
            formatParticipationLabel(participant)
          )
        ),
      ];

      return {
        id: day.id,
        date: formatDateOnly(day.date),
        activityId: day.activity.id,
        activityName: day.activity.name,
        schedule: day.schedule,
        geoLocation: day.geoLocation,
        groupName: day.activityGroup?.name ?? null,
        activityGroupId: day.activityGroupId,
        cancelled: day.cancelled,
        participantLabels,
      };
    });

  return NextResponse.json({
    role: 'MEMBER',
    month: monthKey,
    monthLabel,
    sessions,
  });
}

function formatParticipationLabel(participation: {
  child?: { name?: string | null; lastName?: string | null } | null;
  user?: { name?: string | null; lastName?: string | null } | null;
}) {
  if (participation.child) {
    return (
      [participation.child.name, participation.child.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || 'Sin nombre'
    );
  }

  if (participation.user) {
    return (
      [participation.user.name, participation.user.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || 'Yo'
    );
  }

  return 'Yo';
}
