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

function getCurrentPeriod() {
  const now = new Date();
  return {
    month: now.getUTCMonth() + 1,
    year: now.getUTCFullYear(),
  };
}

export async function getSocialFeeAmount() {
  const concept = await prisma.billableConcept.findUnique({
    where: { code: BillableConceptCode.SOCIAL_FEE },
    select: { defaultAmount: true },
  });

  return concept?.defaultAmount ?? 0;
}

export async function hasSocialFeeForCurrentMonth({
  userId,
  childId,
}: ParticipantInput) {
  const { month, year } = getCurrentPeriod();

  const existing = await prisma.socialFeePayment.findFirst({
    where: {
      periodMonth: month,
      periodYear: year,
      userId,
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

export async function registerSocialFeePayment({
  userId,
  childId,
  amount,
  mercadoPagoPaymentId,
}: ParticipantInput & { amount: number; mercadoPagoPaymentId: string }) {
  const { month, year } = getCurrentPeriod();

  if (childId == null) {
    const existing = await prisma.socialFeePayment.findFirst({
      where: {
        periodMonth: month,
        periodYear: year,
        userId,
        childId: null,
      },
      select: { id: true },
    });

    if (existing) {
      return prisma.socialFeePayment.update({
        where: { id: existing.id },
        data: {
          amount,
          mercadoPagoPaymentId,
        },
      });
    }

    return prisma.socialFeePayment.create({
      data: {
        userId,
        childId: null,
        periodMonth: month,
        periodYear: year,
        amount,
        mercadoPagoPaymentId,
      },
    });
  }

  return prisma.socialFeePayment.upsert({
    where: {
      userId_childId_periodMonth_periodYear: {
        userId,
        childId,
        periodMonth: month,
        periodYear: year,
      },
    },
    create: {
      userId,
      childId,
      periodMonth: month,
      periodYear: year,
      amount,
      mercadoPagoPaymentId,
    },
    update: {
      amount,
      mercadoPagoPaymentId,
    },
  });
}
