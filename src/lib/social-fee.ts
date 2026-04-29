import { BillableConceptCode } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type ParticipantInput = {
  userId: string;
  childId?: string | null;
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

export async function hasSocialFeeForCurrentMonth({ userId, childId }: ParticipantInput) {
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

export async function registerSocialFeePayment({
  userId,
  childId,
  amount,
  mercadoPagoPaymentId,
}: ParticipantInput & { amount: number; mercadoPagoPaymentId: string }) {
  const { month, year } = getCurrentPeriod();

  return prisma.socialFeePayment.upsert({
    where: {
      userId_childId_periodMonth_periodYear: {
        userId,
        childId: childId ?? null,
        periodMonth: month,
        periodYear: year,
      },
    },
    create: {
      userId,
      childId: childId ?? null,
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
