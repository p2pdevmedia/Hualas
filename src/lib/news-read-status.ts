import type { Prisma, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getReadableActivityIds, isNewsAdminRole } from '@/lib/news-access';

export function readableNewsWhereForUser({
  userId,
  role,
  readableActivityIds,
}: {
  userId: string;
  role: Role;
  readableActivityIds: string[] | null;
}): Prisma.NewsWhereInput {
  if (isNewsAdminRole(role)) return {};

  return {
    OR: [
      { scope: 'CLUB' },
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
}

export async function getReadableNewsWhere(input: {
  userId: string;
  role: Role;
}) {
  const readableActivityIds = await getReadableActivityIds(input);
  return readableNewsWhereForUser({ ...input, readableActivityIds });
}

export async function markReadableNewsAsRead(input: {
  userId: string;
  role: Role;
  newsIds: string[];
}) {
  const uniqueIds = Array.from(
    new Set(input.newsIds.map((id) => id.trim()))
  ).filter(Boolean);

  if (uniqueIds.length === 0) {
    return { markedCount: 0, readableIds: [] as string[] };
  }

  const readableWhere = await getReadableNewsWhere({
    userId: input.userId,
    role: input.role,
  });

  const readableNews = await prisma.news.findMany({
    where: {
      AND: [{ id: { in: uniqueIds } }, readableWhere],
    },
    select: { id: true },
  });

  if (readableNews.length === 0) {
    return { markedCount: 0, readableIds: [] as string[] };
  }

  const now = new Date();
  const result = await prisma.newsReadReceipt.createMany({
    data: readableNews.map((item) => ({
      newsId: item.id,
      userId: input.userId,
      readAt: now,
    })),
    skipDuplicates: true,
  });

  return {
    markedCount: result.count,
    readableIds: readableNews.map((item) => item.id),
  };
}
