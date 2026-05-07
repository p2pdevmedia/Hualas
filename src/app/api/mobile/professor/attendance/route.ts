import { NextResponse } from 'next/server';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { formatMobileDateOnly } from '@/lib/mobile-format';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.appRole !== 'PROFESSOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = await prisma.activityDay.findMany({
    where: {
      professors: { some: { userId: session.userId } },
      date: { gte: today },
    },
    select: {
      id: true,
      date: true,
      schedule: true,
      geoLocation: true,
      cancelled: true,
      activityGroupId: true,
      activity: { select: { id: true, name: true } },
      activityGroup: { select: { name: true } },
      _count: {
        select: {
          attendances: true,
        },
      },
    },
    orderBy: { date: 'asc' },
    take: 20,
  });

  return NextResponse.json({
    days: days.map((day) => ({
      id: day.id,
      date: formatMobileDateOnly(day.date),
      schedule: day.schedule,
      geoLocation: day.geoLocation,
      cancelled: day.cancelled,
      activityGroupId: day.activityGroupId,
      activity: day.activity,
      groupName: day.activityGroup?.name ?? null,
      attendanceCount: day._count.attendances,
    })),
  });
}
