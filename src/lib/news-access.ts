import { prisma } from '@/lib/prisma';
import type { Role } from '@prisma/client';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';

export type NewsAccessUser = {
  userId: string;
  role: Role;
};

export function isNewsAdminRole(role: Role) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export async function getReadableActivityIds(user: NewsAccessUser) {
  if (isNewsAdminRole(user.role)) return null;

  if (user.role === 'PROFESSOR') {
    const assignments = await prisma.activityProfessor.findMany({
      where: { userId: user.userId },
      select: { activityId: true },
    });
    return [...new Set(assignments.map((a) => a.activityId))];
  }

  const accessibleChildOwnerIds = await getAccessibleChildOwnerIds(user.userId);
  const participations = await prisma.activityParticipant.findMany({
    where: {
      OR: [
        { userId: user.userId },
        { child: { userId: { in: accessibleChildOwnerIds } } },
      ],
    },
    select: { activityId: true },
  });
  return [...new Set(participations.map((p) => p.activityId))];
}

export async function canUserReadNews({
  userId,
  role,
  newsId,
}: NewsAccessUser & { newsId: string }) {
  if (isNewsAdminRole(role)) return true;

  const news = await prisma.news.findUnique({
    where: { id: newsId },
    select: { scope: true, activityId: true },
  });

  if (!news) return false;
  if (news.scope === 'CLUB') return true;
  if (!news.activityId) return false;

  const activityIds = await getReadableActivityIds({ userId, role });
  return activityIds?.includes(news.activityId) ?? true;
}
