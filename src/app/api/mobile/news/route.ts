import { NextResponse } from 'next/server';
import { getReadableActivityIds } from '@/lib/news-access';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { formatFullName, formatMobileDate } from '@/lib/mobile-format';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const readableActivityIds = await getReadableActivityIds({
    userId: session.userId,
    role: session.appRole,
  });

  const where = {
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
  };

  const news = await prisma.news.findMany({
    where,
    include: {
      activity: { select: { id: true, name: true } },
      createdBy: { select: { name: true, lastName: true } },
      readReceipts: {
        where: { userId: session.userId },
        select: { readAt: true },
        take: 1,
      },
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
    take: 50,
  });

  return NextResponse.json({
    news: news.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      scope: item.scope,
      activityId: item.activity?.id ?? null,
      activityName: item.activity?.name ?? null,
      author: formatFullName(item.createdBy),
      createdAt: formatMobileDate(item.createdAt),
      isRead: item.readReceipts.length > 0,
      readAt: item.readReceipts[0]
        ? formatMobileDate(item.readReceipts[0].readAt)
        : null,
      media: item.media,
    })),
  });
}
