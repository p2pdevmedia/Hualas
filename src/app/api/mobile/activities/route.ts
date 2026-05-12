import { NextResponse } from 'next/server';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';

function parseUpcomingRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  end.setHours(0, 0, 0, 0);

  const monthLabel = 'Próximos 30 días';
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

function parseDayRange(value: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  const start = new Date(year, monthIndex, day);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);

  return { start, end, dayKey: value };
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

function buildDaySummary(days: Array<{ date: Date }>) {
  const counts = new Map<string, number>();

  for (const day of days) {
    const key = formatDateOnly(day.date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, sessionCount]) => ({
      id: date,
      date,
      sessionCount,
    }));
}

function sortByDateAndSchedule<T extends { date: Date; schedule: string }>(
  left: T,
  right: T
) {
  const diff = left.date.getTime() - right.date.getTime();
  if (diff !== 0) {
    return diff;
  }

  return left.schedule.localeCompare(right.schedule);
}

export async function GET(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const { start, end, monthKey, monthLabel } = parseUpcomingRange();
  const requestedDay = parseDayRange(url.searchParams.get('day'));
  const summaryMode =
    url.searchParams.get('summary') === '1' ||
    url.searchParams.get('summary') === 'true';

  if (session.appRole === 'PROFESSOR') {
    const [activityAssignments, directDays] = await Promise.all([
      prisma.activityProfessor.findMany({
        where: { userId: session.userId },
        select: { activityId: true },
      }),
      prisma.activityDay.findMany({
        where: {
          date: requestedDay
            ? { gte: requestedDay.start, lt: requestedDay.end }
            : { gte: start, lt: end },
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
            date: requestedDay
              ? { gte: requestedDay.start, lt: requestedDay.end }
              : { gte: start, lt: end },
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
    const visibleDays = [...merged.values()].sort(sortByDateAndSchedule);

    if (summaryMode) {
      return NextResponse.json({
        role: 'PROFESSOR',
        month: monthKey,
        monthLabel,
        days: buildDaySummary(visibleDays),
      });
    }

    const selectedDays = requestedDay
      ? visibleDays.filter(
          (day) => formatDateOnly(day.date) === requestedDay.dayKey
        )
      : visibleDays;

    const sessions = selectedDays.map((day) => ({
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

    if (requestedDay) {
      return NextResponse.json({
        role: 'PROFESSOR',
        month: monthKey,
        monthLabel,
        day: requestedDay.dayKey,
        sessions,
      });
    }

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
      status: 'ACTIVE',
      OR: [
        { userId: session.userId },
        { child: { userId: { in: accessibleChildOwnerIds } } },
      ],
    },
    select: {
      activityId: true,
      childId: true,
      groupMembership: {
        select: { activityGroupId: true },
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
          date: requestedDay
            ? { gte: requestedDay.start, lt: requestedDay.end }
            : { gte: start, lt: end },
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

  const visibleDays = days.filter((day) =>
    isVisibleForMember(day, scopeByActivityId.get(day.activityId))
  );

  if (summaryMode) {
    return NextResponse.json({
      role: 'MEMBER',
      month: monthKey,
      monthLabel,
      days: buildDaySummary(visibleDays),
    });
  }

  const selectedDays = requestedDay
    ? visibleDays.filter(
        (day) => formatDateOnly(day.date) === requestedDay.dayKey
      )
    : visibleDays;

  const sessions = selectedDays.map((day) => {
    const visibleParticipants = participations.filter((participant) => {
      if (participant.activityId !== day.activityId) return false;

      if (day.activityGroupId === null) return true;

      const participantGroupId =
        participant.groupMembership?.activityGroupId ?? null;
      return participantGroupId === day.activityGroupId;
    });

    const audienceLabel = formatAudienceLabel(visibleParticipants);

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
      audienceLabel,
    };
  });

  if (requestedDay) {
    return NextResponse.json({
      role: 'MEMBER',
      month: monthKey,
      monthLabel,
      day: requestedDay.dayKey,
      sessions,
    });
  }

  return NextResponse.json({
    role: 'MEMBER',
    month: monthKey,
    monthLabel,
    sessions,
  });
}

function formatAudienceLabel(
  participations: Array<{
    childId: string | null;
  }>
) {
  const childCount = participations.filter(
    (participation) => participation.childId !== null
  ).length;
  const hasSelf = participations.some(
    (participation) => participation.childId === null
  );

  if (hasSelf && childCount === 0) {
    return 'Para vos';
  }

  if (!hasSelf && childCount === 1) {
    return 'Para tu hijo/a';
  }

  if (!hasSelf && childCount > 1) {
    return `Para tus ${childCount} hijos/as`;
  }

  if (hasSelf && childCount === 1) {
    return 'Para vos y tu hijo/a';
  }

  if (hasSelf && childCount > 1) {
    return `Para vos y tus ${childCount} hijos/as`;
  }

  return null;
}
