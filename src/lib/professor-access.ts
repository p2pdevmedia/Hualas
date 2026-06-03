import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export function professorScopedActivityDayWhere(
  userId: string
): Prisma.ActivityDayWhereInput {
  return {
    OR: [
      {
        activityGroup: {
          professors: { some: { userId } },
        },
      },
      {
        activityGroupId: null,
        activity: {
          professors: { some: { userId } },
        },
      },
    ],
  };
}

export function professorScopedActivityParticipantWhere(
  userId: string
): Prisma.ActivityParticipantWhereInput {
  return {
    OR: [
      {
        groupMembership: {
          activityGroup: {
            professors: { some: { userId } },
          },
        },
      },
      {
        groupMembership: { is: null },
        activity: {
          professors: { some: { userId } },
        },
      },
    ],
  };
}

export async function canProfessorAccessParticipant(
  userId: string,
  participantId: string
) {
  const participant = await prisma.activityParticipant.findFirst({
    where: {
      id: participantId,
      ...professorScopedActivityParticipantWhere(userId),
    },
    select: { id: true },
  });

  return Boolean(participant);
}

export async function canProfessorAccessUser(
  professorId: string,
  userId: string
) {
  const participant = await prisma.activityParticipant.findFirst({
    where: {
      AND: [
        { OR: [{ userId }, { child: { userId } }] },
        professorScopedActivityParticipantWhere(professorId),
      ],
    },
    select: { id: true },
  });

  return Boolean(participant);
}
