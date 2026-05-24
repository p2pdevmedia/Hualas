import { prisma } from '@/lib/prisma';

export async function isUserAssignedToActivityDay(
  dayId: string,
  userId: string
) {
  const day = await prisma.activityDay.findUnique({
    where: { id: dayId },
    select: {
      activity: { select: { professors: { select: { userId: true } } } },
      activityGroup: { select: { professors: { select: { userId: true } } } },
    },
  });

  if (!day) return false;

  const groupProfessors = day.activityGroup?.professors;
  if (groupProfessors != null) {
    return groupProfessors.some((p) => p.userId === userId);
  }

  return day.activity.professors.some((p) => p.userId === userId);
}
