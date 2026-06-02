import { BillableConceptCode } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { familyGroupService } from '@/lib/services/family-group-service';
import type { ActivityMonthlyPaymentLine } from '@/lib/cart-checkout';

type MercadoPagoReference = {
  activityId: string;
  userId: string;
  childId: string | null;
  groupId: string | null;
  activityDayId: string | null;
};

type MercadoPagoPayer = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

type MercadoPagoMetadata = {
  userId?: unknown;
  socialFeeAmount?: unknown;
  familyDiscountAmount?: unknown;
  shouldChargeSocialFee?: unknown;
  socialFeeParticipants?: unknown;
  activityMonthlyPaymentLines?: unknown;
};

export type MercadoPagoPaymentInput = {
  id?: string | number | null;
  external_reference?: string | null;
  transaction_amount?: number | null;
  currency_id?: string | null;
  date_approved?: string | Date | null;
  date_created?: string | Date | null;
  payer?: MercadoPagoPayer | null;
  metadata?: MercadoPagoMetadata | null;
  status?: string | null;
};

function currentPeriod() {
  const now = new Date();
  return {
    month: now.getUTCMonth() + 1,
    year: now.getUTCFullYear(),
  };
}

function parseReference(value: string): MercadoPagoReference | null {
  const [activityId, userId, childId, groupId, activityDayId] =
    value.split(':');
  if (!activityId || !userId) {
    return null;
  }

  return {
    activityId,
    userId,
    childId: childId || null,
    groupId: groupId || null,
    activityDayId: activityDayId || null,
  };
}

export function parseMercadoPagoReferences(
  externalReference: string | null | undefined
): MercadoPagoReference[] {
  if (!externalReference) {
    return [];
  }

  const rawReferences = externalReference.startsWith('cart|')
    ? externalReference.replace('cart|', '').split(',').filter(Boolean)
    : [externalReference];

  return rawReferences
    .map(parseReference)
    .filter((reference): reference is MercadoPagoReference =>
      Boolean(reference)
    );
}

async function getBillableConceptIds() {
  const [activityFeeConcept, socialFeeConcept, discountConcept] =
    await prisma.$transaction([
      prisma.billableConcept.upsert({
        where: { code: BillableConceptCode.ACTIVITY_FEE },
        create: {
          code: BillableConceptCode.ACTIVITY_FEE,
          name: 'Cuota de actividad',
          active: true,
        },
        update: {
          active: true,
        },
        select: { id: true },
      }),
      prisma.billableConcept.upsert({
        where: { code: BillableConceptCode.SOCIAL_FEE },
        create: {
          code: BillableConceptCode.SOCIAL_FEE,
          name: 'Cuota social',
          active: true,
        },
        update: {
          active: true,
        },
        select: { id: true },
      }),
      prisma.billableConcept.upsert({
        where: { code: BillableConceptCode.DISCOUNT },
        create: {
          code: BillableConceptCode.DISCOUNT,
          name: 'Descuento familiar',
          active: true,
        },
        update: {
          name: 'Descuento familiar',
          active: true,
        },
        select: { id: true },
      }),
    ]);

  return {
    activityFeeConceptId: activityFeeConcept.id,
    socialFeeConceptId: socialFeeConcept.id,
    discountConceptId: discountConcept.id,
  };
}

function formatName(
  name?: string | null,
  lastName?: string | null,
  fallback = 'Sin nombre'
) {
  return `${name ?? ''} ${lastName ?? ''}`.trim() || fallback;
}

export async function syncMercadoPagoApprovedPayment(input: {
  payment: MercadoPagoPaymentInput;
  references: MercadoPagoReference[];
  userId: string;
  socialFeeAmount: number;
  socialFeeParticipantCount: number;
  activityMonthlyPaymentLines?: ActivityMonthlyPaymentLine[];
  familyDiscountAmount?: number;
}) {
  const paymentId = input.payment.id?.toString();
  if (!paymentId) {
    return null;
  }

  const references = input.references.filter(
    (reference) => Boolean(reference.activityId) && Boolean(reference.userId)
  );
  const normalizedSocialFeeAmount = Math.max(
    Number(input.socialFeeAmount ?? 0) || 0,
    0
  );
  const activityMonthlyPaymentLines =
    input.activityMonthlyPaymentLines?.filter((line) => line.amount > 0) ?? [];
  const totalActivityMonthlyPaymentAmount = activityMonthlyPaymentLines.reduce(
    (sum, line) => sum + line.amount,
    0
  );
  const canSyncWithoutReferences =
    references.length === 0 &&
    Boolean(input.userId) &&
    (totalActivityMonthlyPaymentAmount > 0 ||
      (normalizedSocialFeeAmount > 0 && input.socialFeeParticipantCount > 0));
  if (references.length === 0 && !canSyncWithoutReferences) {
    return null;
  }

  const existingPayment = await prisma.payment.findUnique({
    where: { id: `mp-payment:${paymentId}` },
    select: { id: true },
  });
  const created = !existingPayment;

  const activityIds = [
    ...new Set([
      ...references.map((reference) => reference.activityId),
      ...activityMonthlyPaymentLines.map((line) => line.activityId),
    ]),
  ];
  const [user, activities, conceptIds] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
      },
    }),
    activityIds.length > 0
      ? prisma.activity.findMany({
          where: { id: { in: activityIds } },
          select: {
            id: true,
            name: true,
            price: true,
          },
        })
      : Promise.resolve([]),
    getBillableConceptIds(),
  ]);

  if (!user || user.role !== 'MEMBER') {
    return null;
  }

  const activityById = new Map(
    activities.map((activity) => [activity.id, activity])
  );
  const familyGroup =
    await familyGroupService.getOrCreateFamilyGroupByResponsible({
      id: user.id,
      name: user.name ?? null,
      lastName: user.lastName ?? null,
      email: user.email?.trim() || 'sin-email@hualas.local',
      phone: user.phone ?? null,
    });

  const period = currentPeriod();
  const paidAt = new Date(
    input.payment.date_approved ?? input.payment.date_created ?? new Date()
  );
  const familyDiscountAmount = Math.max(
    Number(input.familyDiscountAmount ?? 0) || 0,
    0
  );
  const socialFeeAmount = normalizedSocialFeeAmount;
  const referenceActivityAmount = references.reduce((sum, reference) => {
    const activity = activityById.get(reference.activityId);
    return sum + (activity ? Number(activity.price) : 0);
  }, 0);
  const mpFeeBase =
    referenceActivityAmount +
    totalActivityMonthlyPaymentAmount -
    familyDiscountAmount +
    socialFeeAmount * input.socialFeeParticipantCount;
  const mpFeeAmount = Math.max(Math.round(mpFeeBase * 0.1), 0);
  const orderSubtotal =
    referenceActivityAmount +
    totalActivityMonthlyPaymentAmount +
    socialFeeAmount * input.socialFeeParticipantCount;
  const orderTotal = orderSubtotal - familyDiscountAmount + mpFeeAmount;
  const orderId = `mp-order:${paymentId}`;
  const settlementPaymentId = `mp-payment:${paymentId}`;
  const paymentAmount = Math.round(
    Number(input.payment.transaction_amount ?? orderTotal) * 100
  );
  const payerName = formatName(
    input.payment.payer?.first_name ?? user.name,
    input.payment.payer?.last_name ?? user.lastName,
    user.email ?? 'Sin nombre'
  );

  await prisma.$transaction(async (tx) => {
    await tx.order.upsert({
      where: { id: orderId },
      create: {
        id: orderId,
        familyGroupId: familyGroup.id,
        responsibleUserId: user.id,
        responsibleName: payerName,
        responsibleEmail: input.payment.payer?.email?.trim() || user.email,
        periodMonth: period.month,
        periodYear: period.year,
        status: 'PAID',
        subtotal: orderSubtotal,
        discountTotal: familyDiscountAmount,
        surchargeTotal: mpFeeAmount,
        total: orderTotal,
        paidAt,
      },
      update: {
        familyGroupId: familyGroup.id,
        responsibleUserId: user.id,
        responsibleName: payerName,
        responsibleEmail: input.payment.payer?.email?.trim() || user.email,
        periodMonth: period.month,
        periodYear: period.year,
        status: 'PAID',
        subtotal: orderSubtotal,
        discountTotal: familyDiscountAmount,
        surchargeTotal: mpFeeAmount,
        total: orderTotal,
        paidAt,
      },
    });

    for (const reference of references) {
      const activity = activityById.get(reference.activityId);
      if (!activity) {
        continue;
      }

      const memberId = reference.childId ? null : reference.userId;
      const existingItem = await tx.orderItem.findFirst({
        where: {
          orderId,
          memberId,
          activityId: reference.activityId,
          billableConceptId: conceptIds.activityFeeConceptId,
          periodMonth: period.month,
          periodYear: period.year,
        },
        select: { id: true },
      });

      const itemData = {
        orderId,
        memberId,
        activityId: reference.activityId,
        billableConceptId: conceptIds.activityFeeConceptId,
        description: activity.name,
        quantity: 1,
        unitPrice: Number(activity.price),
        total: Number(activity.price),
        periodMonth: period.month,
        periodYear: period.year,
        status: 'PAID' as const,
      };

      if (existingItem) {
        await tx.orderItem.update({
          where: { id: existingItem.id },
          data: itemData,
        });
      } else {
        await tx.orderItem.create({ data: itemData });
      }
    }

    for (const line of activityMonthlyPaymentLines) {
      const activity = activityById.get(line.activityId);
      if (!activity) {
        continue;
      }

      await tx.orderItem.create({
        data: {
          orderId,
          memberId: line.childId ? null : line.userId,
          activityId: line.activityId,
          billableConceptId: conceptIds.activityFeeConceptId,
          description: activity.name || line.activityName,
          quantity: 1,
          unitPrice: line.amount,
          total: line.amount,
          periodMonth: line.periodMonth,
          periodYear: line.periodYear,
          status: 'PAID',
        },
      });
    }

    if (familyDiscountAmount > 0) {
      const existingDiscount = await tx.orderItem.findFirst({
        where: {
          orderId,
          memberId: user.id,
          activityId: null,
          billableConceptId: conceptIds.discountConceptId,
          periodMonth: period.month,
          periodYear: period.year,
        },
        select: { id: true },
      });

      const discountData = {
        orderId,
        memberId: user.id,
        activityId: null,
        billableConceptId: conceptIds.discountConceptId,
        description: 'Descuento familiar',
        quantity: 1,
        unitPrice: -familyDiscountAmount,
        total: -familyDiscountAmount,
        periodMonth: period.month,
        periodYear: period.year,
        status: 'PAID' as const,
      };

      if (existingDiscount) {
        await tx.orderItem.update({
          where: { id: existingDiscount.id },
          data: discountData,
        });
      } else {
        await tx.orderItem.create({ data: discountData });
      }
    }

    if (socialFeeAmount > 0 && input.socialFeeParticipantCount > 0) {
      const totalSocialFee = socialFeeAmount * input.socialFeeParticipantCount;
      const existingSocialFee = await tx.orderItem.findFirst({
        where: {
          orderId,
          memberId: user.id,
          activityId: null,
          billableConceptId: conceptIds.socialFeeConceptId,
          periodMonth: period.month,
          periodYear: period.year,
        },
        select: { id: true },
      });

      const socialFeeData = {
        orderId,
        memberId: user.id,
        activityId: null,
        billableConceptId: conceptIds.socialFeeConceptId,
        description:
          input.socialFeeParticipantCount === 1
            ? 'Cuota social'
            : `Cuota social (${input.socialFeeParticipantCount} participantes)`,
        quantity: input.socialFeeParticipantCount,
        unitPrice: socialFeeAmount,
        total: totalSocialFee,
        periodMonth: period.month,
        periodYear: period.year,
        status: 'PAID' as const,
      };

      if (existingSocialFee) {
        await tx.orderItem.update({
          where: { id: existingSocialFee.id },
          data: socialFeeData,
        });
      } else {
        await tx.orderItem.create({ data: socialFeeData });
      }
    }

    await tx.payment.upsert({
      where: { id: settlementPaymentId },
      create: {
        id: settlementPaymentId,
        orderId,
        provider: 'MERCADO_PAGO',
        providerPaymentId: paymentId,
        amount: paymentAmount,
        currency: input.payment.currency_id?.trim() || 'ARS',
        status: 'APPROVED',
        paidAt,
        payerName:
          input.payment.payer?.first_name || input.payment.payer?.last_name
            ? `${input.payment.payer?.first_name ?? ''} ${input.payment.payer?.last_name ?? ''}`.trim()
            : payerName,
        payerEmail: input.payment.payer?.email?.trim() || user.email,
      },
      update: {
        orderId,
        provider: 'MERCADO_PAGO',
        providerPaymentId: paymentId,
        amount: paymentAmount,
        currency: input.payment.currency_id?.trim() || 'ARS',
        status: 'APPROVED',
        paidAt,
        payerName:
          input.payment.payer?.first_name || input.payment.payer?.last_name
            ? `${input.payment.payer?.first_name ?? ''} ${input.payment.payer?.last_name ?? ''}`.trim()
            : payerName,
        payerEmail: input.payment.payer?.email?.trim() || user.email,
      },
    });
  });

  return {
    orderId,
    paymentId: settlementPaymentId,
    paymentAmount,
    created,
  };
}
