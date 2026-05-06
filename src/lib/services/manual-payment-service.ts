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
import { buildAccountingSimilarityCondition } from '@/lib/accounting-search';
import {
  notifyManualPaymentApproved,
  notifyManualPaymentRejected,
} from '@/lib/notifications/notification-service';

type CurrentUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  lastName?: string | null;
};

type ManualPaymentListQuery = {
  status?: PaymentStatus | null;
  q?: string;
  limit: number;
  offset: number;
};

export type ManualPaymentSummary = {
  id: string;
  orderId: string;
  responsibleUserId: string | null;
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

type PaymentIdRow = {
  id: string;
};

type CountRow = {
  count: number;
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
    responsibleUserId: string | null;
    responsibleName: string;
    responsibleEmail: string;
    items: Array<{
      billableConcept: { code: string };
      activity: { id: string; name: string; description: string | null } | null;
      description: string;
    }>;
  };
}): ManualPaymentSummary {
  const rawData = getManualPaymentRawData(payment.rawData);
  const reviews = getManualPaymentReviews(payment.rawData);
  const activities = payment.order.items
    .filter((item) => item.billableConcept.code === 'ACTIVITY_FEE')
    .map((item, index) => {
      const activity = item.activity;
      const fallbackName = item.description?.trim() || 'Sin actividad';

      return {
        id: activity?.id ?? `${payment.id}:${index}`,
        name: activity?.name ?? fallbackName,
        description: activity?.description ?? item.description ?? null,
      };
    })
    .filter((activity, index, array) => {
      if (activity.name !== 'Sin actividad') return true;
      return array.length === 1 || index === 0;
    });

  return {
    id: payment.id,
    orderId: payment.orderId,
    responsibleUserId: payment.order.responsibleUserId,
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
    activities,
    reviews,
    rawData,
  };
}

export async function listManualPayments({
  status,
  q,
  limit,
  offset,
}: ManualPaymentListQuery): Promise<ManualPaymentListResponse> {
  const filters: Prisma.Sql[] = [
    Prisma.sql`p."provider"::text = 'MANUAL_TRANSFER'`,
  ];

  if (status) {
    filters.push(Prisma.sql`p."status"::text = ${status}`);
  }

  if (q) {
    filters.push(
      buildAccountingSimilarityCondition(q, [
        Prisma.sql`p."payerName"`,
        Prisma.sql`p."payerEmail"`,
        Prisma.sql`o."responsibleName"`,
        Prisma.sql`o."responsibleEmail"`,
        Prisma.sql`a."name"`,
        Prisma.sql`oi."description"`,
      ])
    );
  }

  const [countRows, paymentIdRows] = await Promise.all([
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(DISTINCT p."id")::int AS "count"
      FROM "Payment" p
      JOIN "Order" o ON o."id" = p."orderId"
      LEFT JOIN "OrderItem" oi ON oi."orderId" = o."id"
      LEFT JOIN "Activity" a ON a."id" = oi."activityId"
      WHERE ${Prisma.join(filters, ' AND ')}
    `,
    prisma.$queryRaw<PaymentIdRow[]>`
      SELECT p."id"
      FROM "Payment" p
      JOIN "Order" o ON o."id" = p."orderId"
      LEFT JOIN "OrderItem" oi ON oi."orderId" = o."id"
      LEFT JOIN "Activity" a ON a."id" = oi."activityId"
      WHERE ${Prisma.join(filters, ' AND ')}
      GROUP BY p."id", p."createdAt"
      ORDER BY p."createdAt" DESC
      OFFSET ${offset}
      LIMIT ${limit}
    `,
  ]);
  const paymentIds = paymentIdRows.map((row) => row.id);
  const paymentOrder = new Map(paymentIds.map((id, index) => [id, index]));
  const payments =
    paymentIds.length > 0
      ? (
          await prisma.payment.findMany({
            where: { id: { in: paymentIds } },
            include: {
              order: {
                select: {
                  responsibleUserId: true,
                  responsibleName: true,
                  responsibleEmail: true,
                  items: {
                    select: {
                      description: true,
                      billableConcept: {
                        select: {
                          code: true,
                        },
                      },
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
          })
        ).sort(
          (left, right) =>
            (paymentOrder.get(left.id) ?? 0) - (paymentOrder.get(right.id) ?? 0)
        )
      : [];

  return {
    total: countRows[0]?.count ?? 0,
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
          responsibleUserId: true,
          responsibleName: true,
          responsibleEmail: true,
          items: {
            select: {
              description: true,
              billableConcept: {
                select: {
                  code: true,
                },
              },
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
    const { activityFeeConceptId, socialFeeConceptId, discountConceptId } =
      await getBillableConceptIds();
    const payment = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const period = currentPeriod();
      const subtotal =
        input.quote.totalActivityAmount + input.quote.totalSocialFeeAmount;
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
          subtotal,
          discountTotal: input.quote.totalDiscountAmount,
          surchargeTotal: 0,
          total: input.quote.totalAmount,
        },
      });

      for (const [index, item] of input.quote.activityLines.entries()) {
        const source = input.quote.validatedItems[index];
        const isChildTarget = source?.target && source.target !== 'self';
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            // null for child registrations — PostgreSQL treats NULL != NULL in
            // unique constraints, so multiple child items never conflict.
            memberId: isChildTarget ? null : input.user.id,
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

        const participant = await tx.activityParticipant.upsert({
          where: { participantKey },
          create: {
            activityId: item.id,
            userId: input.user.id,
            childId:
              source?.target && source.target !== 'self' ? source.target : null,
            participantKey,
          },
          update: {},
          select: { id: true },
        });

        if (source?.groupId) {
          await tx.activityGroupMember.upsert({
            where: { activityParticipantId: participant.id },
            create: {
              activityGroupId: source.groupId,
              activityParticipantId: participant.id,
            },
            update: { activityGroupId: source.groupId },
          });
        }
      }

      if (input.quote.totalDiscountAmount > 0) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            memberId: input.user.id,
            billableConceptId: discountConceptId,
            description: 'Descuento familiar',
            quantity: 1,
            unitPrice: -input.quote.totalDiscountAmount,
            total: -input.quote.totalDiscountAmount,
            periodMonth: period.month,
            periodYear: period.year,
          },
        });
      }

      if (input.quote.socialFeeLines.length > 0) {
        const totalSocialFee = input.quote.socialFeeLines.reduce(
          (sum, line) => sum + line.amount,
          0
        );
        const socialFeeDescription =
          input.quote.socialFeeLines.length === 1
            ? input.quote.socialFeeLines[0].label
            : `Cuota social (${input.quote.socialFeeLines.length} participantes)`;

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            memberId: input.user.id,
            billableConceptId: socialFeeConceptId,
            description: socialFeeDescription,
            quantity: input.quote.socialFeeLines.length,
            unitPrice: input.quote.socialFeeAmount,
            total: totalSocialFee,
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
          amount: input.quote.totalAmount * 100,
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
            familyDiscountAmount: input.quote.totalDiscountAmount,
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

  notifyManualPaymentApproved(updatedPayment.id);

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

  notifyManualPaymentRejected(updatedPayment.id);

  return { payment: updatedPayment };
}

export function formatManualPaymentStatus(status: PaymentStatus) {
  return {
    label: paymentStatusLabel(status),
    className: paymentStatusClass(status),
  };
}
