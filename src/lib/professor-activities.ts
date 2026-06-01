import { prisma } from '@/lib/prisma';

export type ProfessorActivityOption = {
  id: string;
  name: string;
  date: Date;
  endDate: Date;
};

export function professorAssignedActivityWhere(
  professorId: string,
  activityId?: string
) {
  return {
    ...(activityId ? { id: activityId } : {}),
    OR: [
      { professors: { some: { userId: professorId } } },
      {
        groups: {
          some: {
            professors: { some: { userId: professorId } },
          },
        },
      },
    ],
  };
}

export async function findProfessorAssignedActivity(
  professorId: string,
  activityId: string
) {
  return prisma.activity.findFirst({
    where: professorAssignedActivityWhere(professorId, activityId),
    select: { id: true, name: true, date: true, endDate: true },
  });
}

export async function getProfessorAssignedActivityOptions(
  professorId: string
): Promise<ProfessorActivityOption[]> {
  return prisma.activity.findMany({
    where: professorAssignedActivityWhere(professorId),
    orderBy: [{ endDate: 'desc' }, { date: 'desc' }, { name: 'asc' }],
    select: { id: true, name: true, date: true, endDate: true },
  });
}
