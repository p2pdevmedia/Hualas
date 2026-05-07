import { NextResponse } from 'next/server';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { formatFullName, formatMobileDateOnly } from '@/lib/mobile-format';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (session.appRole === 'PROFESSOR') {
    const assignments = await prisma.activityProfessor.findMany({
      where: { userId: session.userId },
      select: {
        activity: {
          select: {
            id: true,
            name: true,
            date: true,
            endDate: true,
            frequency: true,
            price: true,
            description: true,
            groups: { select: { id: true } },
            days: {
              where: { date: { gte: today } },
              select: {
                id: true,
                date: true,
                schedule: true,
                activityGroupId: true,
                activityGroup: { select: { name: true } },
              },
              orderBy: { date: 'asc' },
              take: 5,
            },
          },
        },
      },
      orderBy: { activity: { date: 'asc' } },
    });

    return NextResponse.json({
      role: 'PROFESSOR',
      activities: assignments.map((assignment) => ({
        id: assignment.activity.id,
        name: assignment.activity.name,
        date: formatMobileDateOnly(assignment.activity.date),
        endDate: formatMobileDateOnly(assignment.activity.endDate),
        frequency: assignment.activity.frequency,
        price: assignment.activity.price,
        description: assignment.activity.description,
        groupsCount: assignment.activity.groups.length,
        upcomingDays: assignment.activity.days.map((day) => ({
          id: day.id,
          date: formatMobileDateOnly(day.date),
          schedule: day.schedule,
          groupName: day.activityGroup?.name ?? null,
          activityGroupId: day.activityGroupId,
        })),
      })),
    });
  }

  const accessibleChildOwnerIds = await getAccessibleChildOwnerIds(session.userId);
  const participations = await prisma.activityParticipant.findMany({
    where: {
      OR: [
        { userId: session.userId },
        { child: { userId: { in: accessibleChildOwnerIds } } },
      ],
    },
    select: {
      id: true,
      userId: true,
      activity: {
        select: {
          id: true,
          name: true,
          date: true,
          endDate: true,
          frequency: true,
          price: true,
          description: true,
          days: {
            where: { date: { gte: today } },
            select: {
              id: true,
              date: true,
              schedule: true,
              activityGroupId: true,
              activityGroup: { select: { name: true } },
            },
            orderBy: { date: 'asc' },
            take: 5,
          },
        },
      },
      child: { select: { id: true, name: true, lastName: true } },
      groupMembership: {
        select: {
          activityGroupId: true,
          activityGroup: { select: { name: true } },
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          paymentReference: true,
          paidAt: true,
        },
        orderBy: { paidAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { activity: { date: 'asc' } },
  });

  const uniqueActivities = new Map<string, (typeof participations)[number]['activity']>();
  for (const participation of participations) {
    uniqueActivities.set(participation.activity.id, participation.activity);
  }

  return NextResponse.json({
    role: 'MEMBER',
    activities: Array.from(uniqueActivities.values()).map((activity) => {
      const labels = participations
        .filter((participation) => participation.activity.id === activity.id)
        .map((participation) =>
          participation.child ? formatFullName(participation.child) : 'Yo'
        );

      const participation = participations.find(
        (item) => item.activity.id === activity.id
      );

      return {
        id: activity.id,
        name: activity.name,
        date: formatMobileDateOnly(activity.date),
        endDate: formatMobileDateOnly(activity.endDate),
        frequency: activity.frequency,
        price: activity.price,
        description: activity.description,
        participantLabels: labels,
        groupName: participation?.groupMembership?.activityGroup?.name ?? null,
        nextDays: activity.days.map((day) => ({
          id: day.id,
          date: formatMobileDateOnly(day.date),
          schedule: day.schedule,
          groupName: day.activityGroup?.name ?? null,
          activityGroupId: day.activityGroupId,
        })),
      };
    }),
  });
}
