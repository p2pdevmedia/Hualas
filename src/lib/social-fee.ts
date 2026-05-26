import { BillableConceptCode } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type ParticipantInput = {
  userId: string;
  childId?: string | null;
};

export type SocialFeeParticipant = {
  userId: string;
  childId: string | null;
};

export type SocialFeePeriod = {
  month: number;
  year: number;
};

export type SocialFeePaymentLine = SocialFeeParticipant &
  SocialFeePeriod & {
    amount: number;
  };

export function normalizeSocialFeeAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  // Legacy records were stored in pesos. Values below this threshold are
  // treated as legacy pesos and converted to centavos on read.
  return amount < 100000 ? amount * 100 : amount;
}

type PrismaClientLike = {
  child: {
    findUnique: (args: {
      where: { id: string };
      select: { userId: true };
    }) => Promise<{ userId: string } | null>;
  };
};

async function resolveSocialFeeUserId(
  db: PrismaClientLike,
  userId: string,
  childId?: string | null
) {
  if (!childId) {
    return userId;
  }

  const child = await db.child.findUnique({
    where: { id: childId },
    select: { userId: true },
  });

  return child?.userId ?? userId;
}

export function getCurrentSocialFeePeriod(): SocialFeePeriod {
  const now = new Date();
  return {
    month: now.getUTCMonth() + 1,
    year: now.getUTCFullYear(),
  };
}

export function getSocialFeePeriods(count = 1): SocialFeePeriod[] {
  const safeCount = Math.min(Math.max(Math.floor(count) || 1, 1), 12);
  const current = getCurrentSocialFeePeriod();

  return Array.from({ length: safeCount }, (_, index) => {
    const zeroBasedMonth = current.month - 1 + index;
    return {
      month: (zeroBasedMonth % 12) + 1,
      year: current.year + Math.floor(zeroBasedMonth / 12),
    };
  });
}

export async function getSocialFeeAmount() {
  const concept = await prisma.billableConcept.findUnique({
    where: { code: BillableConceptCode.SOCIAL_FEE },
    select: { defaultAmount: true },
  });

  return normalizeSocialFeeAmount(concept?.defaultAmount ?? 0);
}

export async function hasSocialFeeForCurrentMonth({
  userId,
  childId,
}: ParticipantInput) {
  return hasSocialFeeForPeriod({
    userId,
    childId,
    ...getCurrentSocialFeePeriod(),
  });
}

export async function hasSocialFeeForPeriod({
  userId,
  childId,
  month,
  year,
}: ParticipantInput & SocialFeePeriod) {
  const effectiveUserId = await resolveSocialFeeUserId(prisma, userId, childId);

  const existing = await prisma.socialFeePayment.findFirst({
    where: {
      periodMonth: month,
      periodYear: year,
      userId: effectiveUserId,
      childId: childId ?? null,
    },
    select: { id: true },
  });

  return Boolean(existing);
}

export function normalizeSocialFeeParticipant({
  userId,
  childId,
}: ParticipantInput): SocialFeeParticipant {
  return {
    userId,
    childId: childId ?? null,
  };
}

export function serializeSocialFeeParticipants(
  participants: SocialFeeParticipant[]
) {
  return JSON.stringify(participants);
}

export function serializeSocialFeePaymentLines(lines: SocialFeePaymentLine[]) {
  return JSON.stringify(lines);
}

export function parseSocialFeeParticipants(
  value: unknown
): SocialFeeParticipant[] {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => {
        if (
          !entry ||
          typeof entry !== 'object' ||
          typeof (entry as { userId?: unknown }).userId !== 'string'
        ) {
          return null;
        }

        const childId = (entry as { childId?: unknown }).childId;
        return {
          userId: (entry as { userId: string }).userId,
          childId: typeof childId === 'string' ? childId : null,
        };
      })
      .filter((entry): entry is SocialFeeParticipant => Boolean(entry));
  } catch {
    return [];
  }
}

export function parseSocialFeePaymentLines(
  value: unknown
): SocialFeePaymentLine[] {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => {
        if (
          !entry ||
          typeof entry !== 'object' ||
          typeof (entry as { userId?: unknown }).userId !== 'string'
        ) {
          return null;
        }

        const month = Number((entry as { month?: unknown }).month);
        const year = Number((entry as { year?: unknown }).year);
        const amount = Number((entry as { amount?: unknown }).amount);
        if (
          !Number.isInteger(month) ||
          month < 1 ||
          month > 12 ||
          !Number.isInteger(year) ||
          year < 2000 ||
          !Number.isFinite(amount) ||
          amount <= 0
        ) {
          return null;
        }

        const childId = (entry as { childId?: unknown }).childId;
        return {
          userId: (entry as { userId: string }).userId,
          childId: typeof childId === 'string' ? childId : null,
          month,
          year,
          amount: Math.round(amount),
        };
      })
      .filter((entry): entry is SocialFeePaymentLine => Boolean(entry));
  } catch {
    return [];
  }
}

export async function registerSocialFeePayment({
  userId,
  childId,
  amount,
  mercadoPagoPaymentId,
  periodMonth,
  periodYear,
}: ParticipantInput & {
  amount: number;
  mercadoPagoPaymentId: string;
  periodMonth?: number;
  periodYear?: number;
}) {
  const currentPeriod = getCurrentSocialFeePeriod();
  const month = periodMonth ?? currentPeriod.month;
  const year = periodYear ?? currentPeriod.year;
  const amountInCents = Math.round(amount);

  if (childId == null) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.socialFeePayment.findFirst({
        where: {
          periodMonth: month,
          periodYear: year,
          userId,
          childId: null,
        },
        select: { id: true },
      });

      await tx.user.update({
        where: { id: userId },
        data: { socialFeeActive: true },
      });

      if (existing) {
        return tx.socialFeePayment.update({
          where: { id: existing.id },
          data: {
            amount: amountInCents,
            mercadoPagoPaymentId,
          },
        });
      }

      return tx.socialFeePayment.create({
        data: {
          userId,
          childId: null,
          periodMonth: month,
          periodYear: year,
          amount: amountInCents,
          mercadoPagoPaymentId,
        },
      });
    });
  }

  return prisma.$transaction(async (tx) => {
    const effectiveUserId = await resolveSocialFeeUserId(tx, userId, childId);
    const payment = await tx.socialFeePayment.upsert({
      where: {
        userId_childId_periodMonth_periodYear: {
          userId: effectiveUserId,
          childId,
          periodMonth: month,
          periodYear: year,
        },
      },
      create: {
        userId: effectiveUserId,
        childId,
        periodMonth: month,
        periodYear: year,
        amount: amountInCents,
        mercadoPagoPaymentId,
      },
      update: {
        amount: amountInCents,
        mercadoPagoPaymentId,
      },
    });

    await tx.user.update({
      where: { id: effectiveUserId },
      data: { socialFeeActive: true },
    });

    return payment;
  });
}
