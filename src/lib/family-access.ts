import { prisma } from '@/lib/prisma';

export async function getAccessibleChildOwnerIds(userId: string) {
  const familyGroups = await prisma.familyGroup.findMany({
    where: {
      OR: [
        { responsibleUserId: userId },
        { members: { some: { memberId: userId } } },
      ],
    },
    select: { responsibleUserId: true },
  });

  return Array.from(
    new Set(
      [userId, ...familyGroups.map((group) => group.responsibleUserId)].filter(
        (value): value is string => Boolean(value)
      )
    )
  );
}

export async function getAccessibleChildrenWhere(userId: string) {
  const ownerIds = await getAccessibleChildOwnerIds(userId);
  return { userId: { in: ownerIds } };
}
