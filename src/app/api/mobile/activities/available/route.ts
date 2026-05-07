import { NextResponse } from 'next/server';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { formatMobileDateOnly } from '@/lib/mobile-format';
import { prisma } from '@/lib/prisma';

type ActivityRow = {
  id: string;
  name: string;
  date: Date;
  endDate: Date;
  activityType: string;
  frequency: string;
  image: string | null;
  description: string | null;
  price: number;
  participants: Array<{ id: string }>;
  groups: Array<{
    id: string;
    name: string;
    description: string | null;
    capacity: number | null;
    minAge: number | null;
    maxAge: number | null;
    _count: { members: number };
  }>;
  days: Array<{
    id: string;
    date: Date;
    schedule: string;
    geoLocation: string;
    activityGroupId: string | null;
    activityGroup: { name: string } | null;
    cancelled: boolean;
  }>;
  _count: { participants: number };
};

function getStatusLabel(status: 'OPEN' | 'FULL') {
  switch (status) {
    case 'FULL':
      return 'Sin cupo';
    default:
      return 'Disponible';
  }
}

function getCapacity(activity: ActivityRow) {
  if (
    activity.groups.length === 0 ||
    activity.groups.some((group) => group.capacity == null)
  ) {
    return null;
  }

  return activity.groups.reduce(
    (sum, group) => sum + (group.capacity ?? 0),
    0
  );
}

export async function GET(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.appRole !== 'MEMBER') {
    return NextResponse.json(
      { error: 'Solo los socios pueden ver actividades disponibles.' },
      { status: 403 }
    );
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const activities = await prisma.activity.findMany({
    where: {
      endDate: { gte: todayStart },
    },
    select: {
      id: true,
      name: true,
      date: true,
      endDate: true,
      activityType: true,
      frequency: true,
      image: true,
      description: true,
      price: true,
      participants: { select: { id: true } },
      groups: {
        select: {
          id: true,
          name: true,
          description: true,
          capacity: true,
          minAge: true,
          maxAge: true,
          _count: {
            select: { members: true },
          },
        },
      },
      days: {
        where: {
          cancelled: false,
          date: { gte: todayStart },
        },
        select: {
          id: true,
          date: true,
          schedule: true,
          geoLocation: true,
          activityGroupId: true,
          activityGroup: {
            select: { name: true },
          },
          cancelled: true,
        },
        orderBy: [{ date: 'asc' }, { schedule: 'asc' }],
      },
      _count: {
        select: { participants: true },
      },
    },
    orderBy: { date: 'asc' },
  }) as Promise<ActivityRow[]>;

  const availableActivities = activities
    .map((activity) => {
      const capacity = getCapacity(activity);
      const hasAvailability =
        capacity == null || activity._count.participants < capacity;
      const status: 'OPEN' | 'FULL' = hasAvailability ? 'OPEN' : 'FULL';

      return {
        id: activity.id,
        name: activity.name,
        date: formatMobileDateOnly(activity.date),
        endDate: formatMobileDateOnly(activity.endDate),
        activityType: activity.activityType,
        frequency: activity.frequency,
        image: activity.image,
        description: activity.description,
        price: activity.price,
        participantCount: activity._count.participants,
        groupCount: activity.groups.length,
        hasAvailability,
        availabilityStatus: status,
        availabilityLabel: getStatusLabel(status),
        groups: activity.groups.map((group) => ({
          id: group.id,
          name: group.name,
          description: group.description,
          capacity: group.capacity,
          minAge: group.minAge,
          maxAge: group.maxAge,
          memberCount: group._count.members,
          remainingCapacity:
            group.capacity == null
              ? null
              : Math.max(group.capacity - group._count.members, 0),
        })),
        days: activity.days.map((day) => ({
          id: day.id,
          date: formatMobileDateOnly(day.date),
          schedule: day.schedule,
          geoLocation: day.geoLocation,
          activityGroupId: day.activityGroupId,
          groupName: day.activityGroup?.name ?? null,
          cancelled: day.cancelled,
        })),
      };
    })
    .filter((activity) => activity.hasAvailability);

  return NextResponse.json({
    role: 'MEMBER',
    activities: availableActivities,
  });
}
