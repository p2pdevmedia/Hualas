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
  const children = await prisma.child.findMany({
    where: { userId: { in: accessibleChildOwnerIds } },
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
  const activityDays = childIds.length
    ? await prisma.activityDay.findMany({
        where: {
          date: {
            gt: new Date(),
          },
          activity: {
            participants: {
              some: {
                childId: {
                  in: childIds,
                },
              },
            },
          },
        },
        include: {
          activity: true,
        },
        orderBy: {
          date: 'asc',
        },
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
