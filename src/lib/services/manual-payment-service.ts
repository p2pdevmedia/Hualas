import { del, put } from '@vercel/blob';
import { BillableConceptCode, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getActivityParticipantKey } from '@/lib/activity-participants';
import { registerSocialFeePayment } from '@/lib/social-fee';
import {
  appendManualPaymentReview,
  createManualPaymentRawData,
  getManualPaymentReviews,
  getManualPaymentRawData,
  paymentStatusClass,
  paymentStatusLabel,
  validateManualPaymentFile,
  type ManualPaymentReviewEntry,
} from '@/lib/manual-payments';
import type { CartQuote } from '@/lib/cart-checkout';
import { buildManualPaymentReceiptUrl } from '@/lib/blob-urls';

type CurrentUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  lastName?: string | null;
};

type ManualPaymentListQuery = {
  status?: PaymentStatus | null;
  limit: number;
  offset: number;
};

export type ManualPaymentSummary = {
  id: string;
  orderId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  payerName: string | null;
  payerEmail: string | null;
  receiptUrl: string | null;
  accountantComments: string | null;
  previousRejections: number;
  proofContentType: string | null;
  proofFileName: string | null;
  customerName: string;
  customerEmail: string;
  activities: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  reviews: ManualPaymentReviewEntry[];
  rawData: ReturnType<typeof getManualPaymentRawData>;
};

type ManualPaymentListResponse = {
  total: number;
  items: ManualPaymentSummary[];
};

function currentPeriod() {
  const now = new Date();
  return {
    month: now.getUTCMonth() + 1,
    year: now.getUTCFullYear(),
  };
}

function normalizeName(
  name?: string | null,
  lastName?: string | null,
  fallback = 'Sin nombre'
) {
  return `${name ?? ''} ${lastName ?? ''}`.trim() || fallback;
}

function sanitizeFileName(name: string) {
  const trimmed = name.trim().replace(/\s+/g, '-');
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '');
}

async function getBillableConceptIds() {
  const concepts = await prisma.billableConcept.findMany({
    where: {
      code: {
        in: [BillableConceptCode.ACTIVITY_FEE, BillableConceptCode.SOCIAL_FEE],
      },
    },
    select: { id: true, code: true },
  });

  const byCode = new Map(concepts.map((concept) => [concept.code, concept.id]));
  const activityFeeConceptId = byCode.get(BillableConceptCode.ACTIVITY_FEE);
  const socialFeeConceptId = byCode.get(BillableConceptCode.SOCIAL_FEE);

  if (!activityFeeConceptId || !socialFeeConceptId) {
    throw new Error('Billable concepts are not configured.');
  }

  return {
    activityFeeConceptId,
    socialFeeConceptId,
  };
}

function buildManualPaymentUploadPath(paymentId: string, fileName: string) {
  const now = new Date();
  const dateSegment = now.toISOString().slice(0, 10);
  return `manual-payments/${dateSegment}/${paymentId}/${sanitizeFileName(fileName)}`;
}

function mapPaymentToReview(payment: {
  id: string;
  orderId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  payerName: string | null;
  payerEmail: string | null;
  receiptUrl: string | null;
  rawData: Prisma.JsonValue | null;
  order: {
    responsibleName: string;
    responsibleEmail: string;
    items: Array<{
      activity: { id: string; name: string; description: string | null } | null;
      description: string;
    }>;
  };
}): ManualPaymentSummary {
  const rawData = getManualPaymentRawData(payment.rawData);
  const reviews = getManualPaymentReviews(payment.rawData);

  return {
    id: payment.id,
    orderId: payment.orderId,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    payerName: payment.payerName,
    payerEmail: payment.payerEmail,
    receiptUrl: buildManualPaymentReceiptUrl(payment.id),
    accountantComments: rawData.accountantComments ?? null,
    previousRejections: rawData.previousRejections ?? 0,
    proofContentType: rawData.proofContentType ?? null,
    proofFileName: rawData.proofFileName ?? null,
    customerName:
      payment.payerName ?? normalizeName(payment.order.responsibleName, null),
    customerEmail: payment.payerEmail ?? payment.order.responsibleEmail,
    activities: payment.order.items
      .map((item) => item.activity)
      .filter(
        (
          activity
        ): activity is {
          id: string;
          name: string;
          description: string | null;
        } => Boolean(activity)
      )
      .map((activity) => ({
        id: activity.id,
        name: activity.name,
        description: activity.description,
      })),
    reviews,
    rawData,
  };
}

export async function listManualPayments({
  status,
  limit,
  offset,
}: ManualPaymentListQuery): Promise<ManualPaymentListResponse> {
  const where: Prisma.PaymentWhereInput = {
    provider: 'MANUAL_TRANSFER',
    ...(status ? { status } : {}),
  };

  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        order: {
          select: {
            responsibleName: true,
            responsibleEmail: true,
            items: {
              select: {
                description: true,
                activity: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    total,
    items: payments.map(mapPaymentToReview),
  };
}

export async function getManualPaymentById(id: string) {
  const payment = await prisma.payment.findFirst({
    where: {
      id,
      provider: 'MANUAL_TRANSFER',
    },
    include: {
      order: {
        select: {
          responsibleName: true,
          responsibleEmail: true,
          items: {
            select: {
              description: true,
              activity: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return payment ? mapPaymentToReview(payment) : null;
}

export async function createManualPaymentCheckout(input: {
  user: CurrentUser;
  quote: CartQuote;
  proofFile: File;
}) {
  const validationError = validateManualPaymentFile(input.proofFile);
  if (validationError) {
    return { error: validationError, status: 400 as const };
  }

  const paymentId = crypto.randomUUID();
  const uploadPath = buildManualPaymentUploadPath(
    paymentId,
    input.proofFile.name || 'proof.pdf'
  );
  const uploadedFile = await put(uploadPath, input.proofFile, {
    access: 'private',
    contentType: input.proofFile.type,
  });

  try {
    const { activityFeeConceptId, socialFeeConceptId } =
      await getBillableConceptIds();
    const payment = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const period = currentPeriod();
      const order = await tx.order.create({
        data: {
          responsibleUserId: input.user.id,
          responsibleName:
            input.user.name?.trim() ||
            `${input.user.name ?? ''} ${input.user.lastName ?? ''}`.trim() ||
            input.user.email?.trim() ||
            'Sin nombre',
          responsibleEmail:
            input.user.email?.trim() || 'sin-email@hualas.local',
          periodMonth: period.month,
          periodYear: period.year,
          status: 'PENDING_PAYMENT',
          subtotal: input.quote.totalAmount,
          discountTotal: 0,
          surchargeTotal: 0,
          total: input.quote.totalAmount,
        },
      });

      for (const [index, item] of input.quote.activityLines.entries()) {
        const source = input.quote.validatedItems[index];
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            memberId: input.user.id,
            activityId: item.id,
            billableConceptId: activityFeeConceptId,
            description: item.name,
            quantity: 1,
            unitPrice: item.amount,
            total: item.amount,
            periodMonth: period.month,
            periodYear: period.year,
          },
        });

        const participantKey = getActivityParticipantKey(
          item.id,
          input.user.id,
          source?.target && source.target !== 'self' ? source.target : null
        );

        await tx.activityParticipant.upsert({
          where: { participantKey },
          create: {
            activityId: item.id,
            userId: input.user.id,
            childId:
              source?.target && source.target !== 'self' ? source.target : null,
            participantKey,
          },
          update: {},
        });
      }

      for (const socialFeeLine of input.quote.socialFeeLines) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            memberId: input.user.id,
            billableConceptId: socialFeeConceptId,
            description: socialFeeLine.label,
            quantity: 1,
            unitPrice: socialFeeLine.amount,
            total: socialFeeLine.amount,
            periodMonth: period.month,
            periodYear: period.year,
          },
        });
      }

      const payment = await tx.payment.create({
        data: {
          id: paymentId,
          orderId: order.id,
          provider: 'MANUAL_TRANSFER',
          providerPaymentId: null,
          amount: input.quote.totalAmount,
          currency: 'ARS',
          status: 'PENDING',
          payerName:
            input.user.name?.trim() ||
            `${input.user.name ?? ''} ${input.user.lastName ?? ''}`.trim() ||
            input.user.email?.trim() ||
            'Sin nombre',
          payerEmail: input.user.email?.trim() || null,
          receiptUrl: uploadedFile.url,
          rawData: createManualPaymentRawData({
            uploadedBy: input.user.email?.trim() || 'unknown',
            uploadedAt: now,
            proofFileName: input.proofFile.name || 'proof',
            proofContentType:
              input.proofFile.type || 'application/octet-stream',
            socialFeeAmount: input.quote.socialFeeAmount,
            socialFeeParticipants: input.quote.socialFeeParticipants,
            validatedItems: input.quote.validatedItems,
          }),
        },
      });

      return payment;
    });

    return { payment };
  } catch (error) {
    await del(uploadedFile.url).catch(() => undefined);
    throw error;
  }
}

export async function approveManualPayment({
  id,
  reviewer,
}: {
  id: string;
  reviewer: CurrentUser;
}) {
  const payment = await prisma.payment.findFirst({
    where: {
      id,
      provider: 'MANUAL_TRANSFER',
    },
    include: {
      order: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!payment) {
    return { error: 'Payment record not found', status: 404 as const };
  }

  if (payment.status !== 'PENDING') {
    return {
      error: 'This payment was already processed',
      status: 409 as const,
    };
  }

  const now = new Date();
  const updatedPayment = await prisma.$transaction(async (tx) => {
    const orderItems = await tx.orderItem.findMany({
      where: { orderId: payment.orderId },
      select: { id: true },
    });

    await tx.order.update({
      where: { id: payment.orderId },
      data: { status: 'PAID', paidAt: now },
    });

    await tx.orderItem.updateMany({
      where: { orderId: payment.orderId },
      data: { status: 'PAID' },
    });

    if (orderItems.length > 0) {
      await tx.memberMonthlyCharge.updateMany({
        where: { orderItemId: { in: orderItems.map((item) => item.id) } },
        data: { status: 'PAID', paidAt: now, paymentId: payment.id },
      });
    }

    return tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'APPROVED',
        paidAt: now,
        rawData: appendManualPaymentReview(payment.rawData, {
          action: 'approved',
          by: reviewer.email ?? reviewer.name ?? 'admin',
          at: now.toISOString(),
          result: 'approved',
        }),
      },
    });
  });

  const rawData = getManualPaymentRawData(updatedPayment.rawData);
  const socialFeeParticipants = rawData.socialFeeParticipants ?? [];
  const socialFeeAmount = rawData.socialFeeAmount ?? 0;

  if (socialFeeParticipants.length > 0 && socialFeeAmount > 0) {
    const uniqueParticipants = new Map(
      socialFeeParticipants.map((participant) => [
        `${participant.userId}:${participant.childId ?? 'self'}`,
        participant,
      ])
    );

    for (const participant of uniqueParticipants.values()) {
      await registerSocialFeePayment({
        userId: participant.userId,
        childId: participant.childId,
        amount: socialFeeAmount,
        mercadoPagoPaymentId: updatedPayment.id,
      });
    }
  }

  return { payment: updatedPayment };
}

export async function rejectManualPayment({
  id,
  reviewer,
  comment,
}: {
  id: string;
  reviewer: CurrentUser;
  comment?: string | null;
}) {
  const payment = await prisma.payment.findFirst({
    where: {
      id,
      provider: 'MANUAL_TRANSFER',
    },
  });

  if (!payment) {
    return { error: 'Payment record not found', status: 404 as const };
  }

  if (payment.status !== 'PENDING') {
    return {
      error: 'This payment was already processed',
      status: 409 as const,
    };
  }

  const now = new Date();
  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'REJECTED',
      rawData: appendManualPaymentReview(payment.rawData, {
        action: 'rejected',
        by: reviewer.email ?? reviewer.name ?? 'admin',
        at: now.toISOString(),
        result: 'rejected',
        comment: comment?.trim() || undefined,
      }),
    },
  });

  return { payment: updatedPayment };
}

export function formatManualPaymentStatus(status: PaymentStatus) {
  return {
    label: paymentStatusLabel(status),
    className: paymentStatusClass(status),
  };
}
