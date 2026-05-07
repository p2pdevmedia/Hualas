import { NextResponse } from 'next/server';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import { getReadableActivityIds } from '@/lib/news-access';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import {
  formatFullName,
  formatMobileDate,
  formatMobileDateOnly,
} from '@/lib/mobile-format';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.appRole === 'PROFESSOR') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [assignments, upcomingDays, unreadCount, recentNews] = await Promise.all([
      prisma.activityProfessor.findMany({
        where: { userId: session.userId },
        select: {
          activityId: true,
          activity: {
            select: {
              id: true,
              name: true,
              date: true,
              endDate: true,
              frequency: true,
              groups: { select: { id: true } },
            },
          },
        },
        orderBy: { activity: { date: 'asc' } },
      }),
      prisma.activityDay.findMany({
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
          activity: { select: { id: true, name: true } },
          activityGroup: { select: { name: true } },
        },
        orderBy: { date: 'asc' },
        take: 6,
      }),
      prisma.notification.count({ where: { userId: session.userId, readAt: null } }),
      loadRecentMobileNews(
        session.userId,
        session.appRole as 'MEMBER' | 'PROFESSOR'
      ),
    ]);

    const activityIds = [...new Set(assignments.map((item) => item.activity.id))];
    const [groupCount, pendingAttendanceCount] = await Promise.all([
      prisma.activityGroup.count({
        where: { activityId: { in: activityIds } },
      }),
      prisma.activityDayAttendance.count({
        where: {
          status: 'PENDING',
          activityDay: {
            date: { gte: today },
            professors: { some: { userId: session.userId } },
          },
        },
      }),
    ]);

    return NextResponse.json({
      kind: 'professor',
      profile: {
        id: session.user.id,
        name: formatFullName(session.user),
        email: session.user.email,
      },
      stats: {
        activitiesCount: activityIds.length,
        groupsCount: groupCount,
        upcomingDaysCount: upcomingDays.length,
        pendingAttendanceCount,
        unreadNotificationsCount: unreadCount,
      },
      upcomingDays: upcomingDays.map((day) => ({
        id: day.id,
        activityId: day.activity.id,
        activityName: day.activity.name,
        groupName: day.activityGroup?.name ?? null,
        date: formatMobileDateOnly(day.date),
        schedule: day.schedule,
        geoLocation: day.geoLocation,
        cancelled: day.cancelled,
      })),
      recentNews,
      activities: assignments.map((item) => ({
        id: item.activity.id,
        name: item.activity.name,
        date: formatMobileDateOnly(item.activity.date),
        endDate: formatMobileDateOnly(item.activity.endDate),
        frequency: item.activity.frequency,
        groupsCount: item.activity.groups.length,
      })),
    });
  }

  const accessibleChildOwnerIds = await getAccessibleChildOwnerIds(session.userId);
  const [children, participations, unreadCount, recentNews] = await Promise.all([
    prisma.child.findMany({
      where: { userId: { in: accessibleChildOwnerIds } },
      select: {
        id: true,
        name: true,
        lastName: true,
        birthDate: true,
        profilePhoto: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.activityParticipant.findMany({
      where: {
        OR: [
          { userId: session.userId },
          { child: { userId: { in: accessibleChildOwnerIds } } },
        ],
      },
      select: {
        id: true,
        childId: true,
        userId: true,
        activity: {
          select: {
            id: true,
            name: true,
            date: true,
            endDate: true,
            frequency: true,
            price: true,
          },
        },
        child: { select: { id: true, name: true, lastName: true } },
        groupMembership: {
          select: {
            activityGroupId: true,
            activityGroup: { select: { name: true } },
          },
        },
      },
      orderBy: { activity: { date: 'asc' } },
    }),
    prisma.notification.count({ where: { userId: session.userId, readAt: null } }),
    loadRecentMobileNews(
      session.userId,
      session.appRole as 'MEMBER' | 'PROFESSOR'
    ),
  ]);

  const activityIds = [...new Set(participations.map((p) => p.activity.id))];
  const upcomingDays = activityIds.length
    ? await prisma.activityDay.findMany({
        where: {
          activityId: { in: activityIds },
          date: { gte: todayStart() },
        },
        select: {
          id: true,
          date: true,
          schedule: true,
          geoLocation: true,
          cancelled: true,
          activity: { select: { id: true, name: true } },
          activityGroup: { select: { name: true } },
        },
        orderBy: { date: 'asc' },
        take: 6,
      })
    : [];

  return NextResponse.json({
    kind: 'member',
    profile: {
      id: session.user.id,
      name: formatFullName(session.user),
      email: session.user.email,
    },
    stats: {
      childrenCount: children.length,
      activitiesCount: activityIds.length,
      upcomingDaysCount: upcomingDays.length,
      unreadNotificationsCount: unreadCount,
    },
    children: children.map((child) => ({
      id: child.id,
      name: child.name,
      lastName: child.lastName,
      birthDate: formatMobileDateOnly(child.birthDate),
      profilePhoto: child.profilePhoto,
    })),
    activities: participations.map((participation) => ({
      id: participation.activity.id,
      name: participation.activity.name,
      date: formatMobileDateOnly(participation.activity.date),
      endDate: formatMobileDateOnly(participation.activity.endDate),
      frequency: participation.activity.frequency,
      price: participation.activity.price,
      participantName: formatParticipationName(participation),
      groupName: participation.groupMembership?.activityGroup?.name ?? null,
    })),
    upcomingDays: upcomingDays.map((day) => ({
      id: day.id,
      activityId: day.activity.id,
      activityName: day.activity.name,
      groupName: day.activityGroup?.name ?? null,
      date: formatMobileDateOnly(day.date),
      schedule: day.schedule,
      geoLocation: day.geoLocation,
      cancelled: day.cancelled,
    })),
    recentNews,
  });
}

function formatParticipationName(participation: {
  child?: { name?: string | null; lastName?: string | null } | null;
  userId: string;
}) {
  if (participation.child) {
    return formatFullName(participation.child);
  }

  return 'Yo';
}

function todayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

async function loadRecentMobileNews(
  userId: string,
  role: 'MEMBER' | 'PROFESSOR'
) {
  const readableActivityIds = await getReadableActivityIds({
    userId,
    role: role as any,
  });

  const news = await prisma.news.findMany({
    where: {
      OR: [
        { scope: 'CLUB' as const },
        ...(readableActivityIds && readableActivityIds.length > 0
          ? [
              {
                scope: 'ACTIVITY' as const,
                activityId: { in: readableActivityIds },
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      title: true,
      body: true,
      scope: true,
      createdAt: true,
      activity: { select: { id: true, name: true } },
      createdBy: { select: { name: true, lastName: true } },
      media: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          url: true,
          mimeType: true,
          type: true,
          fileName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  return news.map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    scope: item.scope,
    activityId: item.activity?.id ?? null,
    activityName: item.activity?.name ?? null,
    author: formatFullName(item.createdBy),
    createdAt: formatMobileDate(item.createdAt),
    media: item.media.map((media) => ({
      id: media.id,
      url: media.url,
      mimeType: media.mimeType,
      type: media.type,
      fileName: media.fileName,
    })),
  }));
}
