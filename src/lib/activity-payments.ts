import { ActivityType, type Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type PrismaClientLike = Prisma.TransactionClient;

type RegisterActivityParticipantPaymentInput = {
  activityParticipantId: string;
  activityId: string;
  userId: string;
  childId?: string | null;
  activityDayId?: string | null;
  groupId?: string | null;
  amount?: number;
  paymentReference: string;
  paidAt?: Date | string | null;
};

function getPaidAt(value?: Date | string | null) {
  return value ? new Date(value) : new Date();
}

function getMonthlyPeriod(date: Date) {
  return {
    periodMonth: date.getUTCMonth() + 1,
    periodYear: date.getUTCFullYear(),
  };
}

async function resolveTemporaryActivityDayId(
  db: PrismaClientLike,
  input: Pick<
    RegisterActivityParticipantPaymentInput,
    'activityId' | 'activityDayId' | 'groupId'
  >
) {
  if (input.activityDayId) {
    const day = await db.activityDay.findFirst({
      where: {
        id: input.activityDayId,
        activityId: input.activityId,
        cancelled: false,
      },
      select: { id: true },
    });
    return day?.id ?? null;
  }

  const candidates = await db.activityDay.findMany({
    where: {
      activityId: input.activityId,
      cancelled: false,
      ...(input.groupId ? { activityGroupId: input.groupId } : {}),
    },
    select: { id: true },
    orderBy: { date: 'asc' },
    take: 2,
  });

  return candidates.length === 1 ? candidates[0].id : null;
}

export async function registerActivityParticipantPayment(
  input: RegisterActivityParticipantPaymentInput,
  db: PrismaClientLike = prisma as unknown as PrismaClientLike
) {
  const paidAt = getPaidAt(input.paidAt);
  const activity = await db.activity.findUnique({
    where: { id: input.activityId },
    select: {
      id: true,
      activityType: true,
      price: true,
    },
  });

  if (!activity) {
    return null;
  }
  const amount = input.amount ?? Number(activity.price);

  if (activity.activityType === ActivityType.ANNUAL) {
    const { periodMonth, periodYear } = getMonthlyPeriod(paidAt);

    return db.activityParticipantPayment.upsert({
      where: {
        activityParticipantId_periodMonth_periodYear: {
          activityParticipantId: input.activityParticipantId,
          periodMonth,
          periodYear,
        },
      },
      create: {
        activityParticipantId: input.activityParticipantId,
        activityId: input.activityId,
        userId: input.userId,
        childId: input.childId ?? null,
        paymentType: 'MONTHLY',
        periodMonth,
        periodYear,
        amount,
        paymentReference: input.paymentReference,
        paidAt,
      },
      update: {
        amount,
        paymentReference: input.paymentReference,
        paidAt,
      },
    });
  }

  const activityDayId = await resolveTemporaryActivityDayId(db, input);
  if (!activityDayId) {
    return null;
  }

  return db.activityParticipantPayment.upsert({
    where: {
      activityParticipantId_activityDayId: {
        activityParticipantId: input.activityParticipantId,
        activityDayId,
      },
    },
    create: {
      activityParticipantId: input.activityParticipantId,
      activityId: input.activityId,
      userId: input.userId,
      childId: input.childId ?? null,
      activityDayId,
      paymentType: 'SESSION',
      amount,
      paymentReference: input.paymentReference,
      paidAt,
    },
    update: {
      amount,
      paymentReference: input.paymentReference,
      paidAt,
    },
  });
}
