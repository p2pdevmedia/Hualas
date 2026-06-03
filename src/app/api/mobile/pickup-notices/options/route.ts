import { NextResponse } from 'next/server';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import { formatFullName } from '@/lib/mobile-format';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';

function formatActivityDayLabel(day: {
  date: Date;
  schedule: string;
  activity: { name: string };
}) {
  const dateLabel = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(day.date);

  return `${day.activity.name} · ${dateLabel} · ${day.schedule}`;
}

export async function GET(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.appRole !== 'MEMBER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const accessibleChildOwnerIds = await getAccessibleChildOwnerIds(
    session.userId
  );
  const now = new Date();
  const children = await prisma.child.findMany({
    where: {
      userId: { in: accessibleChildOwnerIds },
      activityParticipants: {
        some: {
          activity: {
            days: {
              some: {
                date: { gt: now },
                cancelled: false,
              },
            },
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      lastName: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      lastName: true,
    },
    orderBy: [{ name: 'asc' }, { lastName: 'asc' }],
  });

  const childIds = children.map((child) => child.id);
  const eligibleParticipants = childIds.length
    ? await prisma.activityParticipant.findMany({
        where: {
          childId: { in: childIds },
          status: 'ACTIVE',
        },
        select: {
          activityId: true,
          groupMembership: {
            select: { activityGroupId: true },
          },
        },
      })
    : [];
  const eligibleActivityIds = Array.from(
    new Set(eligibleParticipants.map((participant) => participant.activityId))
  );
  const eligibleGroupIdsByActivityId = new Map<string, Set<string>>();
  for (const participant of eligibleParticipants) {
    const groupId = participant.groupMembership?.activityGroupId;
    if (!groupId) continue;
    const groupIds =
      eligibleGroupIdsByActivityId.get(participant.activityId) ??
      new Set<string>();
    groupIds.add(groupId);
    eligibleGroupIdsByActivityId.set(participant.activityId, groupIds);
  }

  const activityDays = eligibleActivityIds.length
    ? (
        await prisma.activityDay.findMany({
          where: {
            date: { gt: now },
            cancelled: false,
            activityId: { in: eligibleActivityIds },
          },
          include: {
            activity: true,
          },
          orderBy: {
            date: 'asc',
          },
        })
      ).filter((day) => {
        if (!day.activityGroupId) return true;
        return eligibleGroupIdsByActivityId
          .get(day.activityId)
          ?.has(day.activityGroupId);
      })
    : [];

  return NextResponse.json({
    children: children.map((child) => ({
      id: child.id,
      label: formatFullName(child),
    })),
    users: users.map((user) => ({
      id: user.id,
      label: formatFullName(user),
    })),
    activityDays: activityDays.map((day) => ({
      id: day.id,
      label: formatActivityDayLabel(day),
    })),
  });
}
