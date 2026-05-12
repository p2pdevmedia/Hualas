import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type TransactionLike = Prisma.TransactionClient;
type PrismaClientLike = {
  $transaction<T>(fn: (tx: TransactionLike) => Promise<T> | T): Promise<T>;
};

type WithdrawalInput = {
  activityId: string;
  participantId: string;
  userId: string;
  note: string;
  rating: number;
  now?: Date;
};

type BillingState = {
  status?: 'ACTIVE' | 'WITHDRAWN' | null;
  withdrawnAt?: Date | string | null;
};

export function isActivityParticipantBillableForPeriod(
  participant: BillingState,
  periodStart: Date
) {
  if (participant.status !== 'WITHDRAWN') {
    return true;
  }

  if (!participant.withdrawnAt) {
    return false;
  }

  const withdrawnAt =
    participant.withdrawnAt instanceof Date
      ? participant.withdrawnAt
      : new Date(participant.withdrawnAt);

  return !Number.isNaN(withdrawnAt.getTime()) && withdrawnAt >= periodStart;
}

export async function withdrawActivityParticipant(
  input: WithdrawalInput,
  db?: PrismaClientLike
) {
  const client = db ?? (prisma as unknown as PrismaClientLike);
  const withdrawnAt = input.now ?? new Date();

  return client.$transaction(async (tx: TransactionLike) => {
    const participant = await tx.activityParticipant.findFirst({
      where: {
        id: input.participantId,
        activityId: input.activityId,
        status: 'ACTIVE',
        OR: [{ userId: input.userId }, { child: { userId: input.userId } }],
      },
      select: { id: true },
    });

    if (!participant) {
      return null;
    }

    await tx.activityGroupMember.deleteMany({
      where: { activityParticipantId: participant.id },
    });

    return tx.activityParticipant.update({
      where: { id: participant.id },
      data: {
        status: 'WITHDRAWN',
        withdrawnAt,
        withdrawalNote: input.note.trim(),
        withdrawalRating: input.rating,
      },
      select: {
        id: true,
        status: true,
        withdrawnAt: true,
        withdrawalNote: true,
        withdrawalRating: true,
      },
    });
  });
}
