import { Prisma } from '@prisma/client';
import { getActivityParticipantKey } from '@/lib/activity-participants';
import { registerActivityParticipantPayment } from '@/lib/activity-payments';
import { prisma } from '@/lib/prisma';

type DbClient = any;

type FinalizePaidActivityEnrollmentInput = {
  activityId: string;
  userId: string;
  childId?: string | null;
  groupId?: string | null;
  activityDayId?: string | null;
  amount?: number | null;
  paymentReference: string;
  paidAt?: Date | string | null;
  receipt?: string | null;
  receiptDate?: Date | string | null;
};

type ActivityForEnrollment = {
  price: number;
  groups: Array<{
    id: string;
    capacity: number | null;
  }>;
};

type ExistingParticipantForEnrollment = {
  id: string;
  status: 'ACTIVE' | 'WITHDRAWN';
};

export type FinalizePaidActivityEnrollmentResult =
  | {
      status: 'enrolled';
      participant: { id: string };
      created: boolean;
      activityCapacity: number | null;
      activeParticipantCountBefore: number;
    }
  | {
      status: 'skipped';
      reason:
        | 'activity_not_found'
        | 'activity_full'
        | 'group_full'
        | 'group_not_found';
    };

function toDate(value?: Date | string | null) {
  return value ? new Date(value) : new Date();
}

async function finalizePaidActivityEnrollmentInTransaction(
  input: FinalizePaidActivityEnrollmentInput,
  db: DbClient
): Promise<FinalizePaidActivityEnrollmentResult> {
  await db.$queryRaw`SELECT "id" FROM "Activity" WHERE "id" = ${input.activityId} FOR UPDATE`;
  if (input.groupId) {
    await db.$queryRaw`SELECT "id" FROM "ActivityGroup" WHERE "id" = ${input.groupId} FOR UPDATE`;
  }

  const activity = (await db.activity.findUnique({
    where: { id: input.activityId },
    select: {
      price: true,
      groups: {
        select: {
          id: true,
          capacity: true,
        },
      },
    },
  })) as ActivityForEnrollment | null;

  if (!activity) {
    return { status: 'skipped', reason: 'activity_not_found' };
  }

  const selectedGroup = input.groupId
    ? activity.groups.find((group) => group.id === input.groupId)
    : null;
  if (input.groupId && !selectedGroup) {
    return { status: 'skipped', reason: 'group_not_found' };
  }

  const childId = input.childId ?? null;
  const participantKey = getActivityParticipantKey(
    input.activityId,
    input.userId,
    childId
  );
  const existingParticipant = (await db.activityParticipant.findUnique({
    where: { participantKey },
    select: { id: true, status: true },
  })) as ExistingParticipantForEnrollment | null;
  const needsActiveSeat = existingParticipant?.status !== 'ACTIVE';

  const activeParticipantCount = await db.activityParticipant.count({
    where: {
      activityId: input.activityId,
      status: 'ACTIVE',
    },
  });
  const activityCapacity =
    activity.groups.length === 0 ||
    activity.groups.some((group) => group.capacity == null)
      ? null
      : activity.groups.reduce(
          (sum, group) => sum + (group.capacity as number),
          0
        );

  if (
    activityCapacity != null &&
    needsActiveSeat &&
    activeParticipantCount >= activityCapacity
  ) {
    return { status: 'skipped', reason: 'activity_full' };
  }

  if (selectedGroup?.capacity != null && needsActiveSeat) {
    const activeGroupMemberCount = await db.activityGroupMember.count({
      where: {
        activityGroupId: selectedGroup.id,
        activityParticipant: { status: 'ACTIVE' },
      },
    });
    if (activeGroupMemberCount >= selectedGroup.capacity) {
      return { status: 'skipped', reason: 'group_full' };
    }
  }

  const paidAt = toDate(input.paidAt);
  const receiptDate = toDate(input.receiptDate ?? paidAt);
  const participantData = {
    receipt: input.receipt ?? input.paymentReference,
    receiptDate,
    status: 'ACTIVE' as const,
    withdrawnAt: null,
  };

  const participant = await db.activityParticipant.upsert({
    where: { participantKey },
    create: {
      activityId: input.activityId,
      userId: input.userId,
      childId,
      participantKey,
      ...participantData,
    },
    update: participantData,
    select: { id: true },
  });

  if (selectedGroup) {
    await db.activityGroupMember.upsert({
      where: { activityParticipantId: participant.id },
      create: {
        activityGroupId: selectedGroup.id,
        activityParticipantId: participant.id,
      },
      update: { activityGroupId: selectedGroup.id },
    });
  }

  await registerActivityParticipantPayment(
    {
      activityParticipantId: participant.id,
      activityId: input.activityId,
      userId: input.userId,
      childId,
      groupId: input.groupId,
      activityDayId: input.activityDayId,
      amount: input.amount ?? Number(activity.price),
      paymentReference: input.paymentReference,
      paidAt,
    },
    db as Prisma.TransactionClient
  );

  return {
    status: 'enrolled',
    participant,
    created: needsActiveSeat,
    activityCapacity,
    activeParticipantCountBefore: activeParticipantCount,
  };
}

export async function finalizePaidActivityEnrollment(
  input: FinalizePaidActivityEnrollmentInput,
  db?: DbClient
) {
  if (db) {
    return finalizePaidActivityEnrollmentInTransaction(input, db);
  }

  return prisma.$transaction(
    (tx) => finalizePaidActivityEnrollmentInTransaction(input, tx),
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 30_000,
    }
  );
}
