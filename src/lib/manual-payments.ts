import type { Prisma, PaymentStatus } from '@prisma/client';
import type { ActivityMonthlyPaymentLine } from '@/lib/cart-checkout';
import {
  MANUAL_PAYMENT_SIGNATURE_KINDS,
  validateFileSignature,
} from '@/lib/security/file-signatures';

export const MANUAL_PAYMENT_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MANUAL_PAYMENT_ACCEPTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
] as const;

export const MANUAL_PAYMENT_INSTRUCTIONS = [
  'Transferencia bancaria manual',
  'Banco: Banco Provincia Del Neuquén (BPN)',
  'CBU: 0970005510009746770016',
  'Alias: clubhualas',
  'Cuenta: Cuenta Corriente 5-974677/1',
  'CUIT/CUIL: 30717495353',
  'Concepto: Club Hualas - nombre de la actividad',
].join('\n');

export type ManualPaymentReviewAction = 'uploaded' | 'approved' | 'rejected';

export type ManualPaymentReviewEntry = {
  action: ManualPaymentReviewAction;
  by: string;
  at: string;
  result?: 'approved' | 'rejected';
  comment?: string;
};

export type ManualPaymentRawData = {
  uploadedBy?: string;
  uploadedAt?: string;
  proofFileName?: string;
  proofContentType?: string;
  accountantComments?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  previousRejections?: number;
  socialFeeAmount?: number;
  familyDiscountAmount?: number;
  socialFeeParticipants?: Array<{
    userId: string;
    childId: string | null;
  }>;
  socialFeePaymentLines?: Array<{
    userId: string;
    childId: string | null;
    month: number;
    year: number;
    amount: number;
  }>;
  activityMonthlyPaymentLines?: ActivityMonthlyPaymentLine[];
  validatedItems?: Array<{
    activityId: string;
    target?: string;
    targetLabel?: string;
    groupId?: string;
    activityDayId?: string;
    activityDayLabel?: string;
  }>;
  reviews?: ManualPaymentReviewEntry[];
};

export function isManualPaymentFile(file: File) {
  return MANUAL_PAYMENT_ACCEPTED_MIME_TYPES.includes(
    file.type as (typeof MANUAL_PAYMENT_ACCEPTED_MIME_TYPES)[number]
  );
}

export function validateManualPaymentFile(file: File) {
  if (!isManualPaymentFile(file)) {
    return 'Por favor subí una imagen (PNG, JPG) o un PDF';
  }

  if (file.size > MANUAL_PAYMENT_MAX_FILE_SIZE) {
    return 'El archivo debe pesar menos de 5 MB';
  }

  return null;
}

export async function validateManualPaymentFileContent(file: File) {
  const validationError = validateManualPaymentFile(file);
  if (validationError) {
    return { ok: false as const, error: validationError };
  }

  return validateFileSignature(
    file,
    MANUAL_PAYMENT_SIGNATURE_KINDS,
    'El comprobante no coincide con un PNG, JPG o PDF válido'
  );
}

function asObject(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function getManualPaymentRawData(
  value: Prisma.JsonValue | null | undefined
): ManualPaymentRawData {
  const rawData = asObject(value);
  if (!rawData) return {};

  const socialFeeParticipants = Array.isArray(rawData.socialFeeParticipants)
    ? rawData.socialFeeParticipants
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          const userId =
            typeof (entry as { userId?: unknown }).userId === 'string'
              ? (entry as { userId: string }).userId
              : null;
          if (!userId) return null;
          const childId = (entry as { childId?: unknown }).childId;
          return {
            userId,
            childId: typeof childId === 'string' ? childId : null,
          };
        })
        .filter(
          (
            entry
          ): entry is {
            userId: string;
            childId: string | null;
          } => Boolean(entry)
        )
    : undefined;

  const validatedItems = Array.isArray(rawData.validatedItems)
    ? rawData.validatedItems
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          const activityId =
            typeof (entry as { activityId?: unknown }).activityId === 'string'
              ? (entry as { activityId: string }).activityId
              : null;
          if (!activityId) return null;
          const target =
            typeof (entry as { target?: unknown }).target === 'string'
              ? (entry as { target: string }).target
              : undefined;
          const targetLabel =
            typeof (entry as { targetLabel?: unknown }).targetLabel === 'string'
              ? (entry as { targetLabel: string }).targetLabel
              : undefined;
          const groupId =
            typeof (entry as { groupId?: unknown }).groupId === 'string'
              ? (entry as { groupId: string }).groupId
              : undefined;
          const activityDayId =
            typeof (entry as { activityDayId?: unknown }).activityDayId ===
            'string'
              ? (entry as { activityDayId: string }).activityDayId
              : undefined;
          const activityDayLabel =
            typeof (entry as { activityDayLabel?: unknown })
              .activityDayLabel === 'string'
              ? (entry as { activityDayLabel: string }).activityDayLabel
              : undefined;
          return {
            activityId,
            target,
            targetLabel,
            groupId,
            activityDayId,
            activityDayLabel,
          };
        })
        .filter(
          (
            entry
          ): entry is {
            activityId: string;
            target: string | undefined;
            targetLabel: string | undefined;
            groupId: string | undefined;
            activityDayId: string | undefined;
            activityDayLabel: string | undefined;
          } => Boolean(entry)
        )
    : undefined;

  const socialFeePaymentLines = Array.isArray(rawData.socialFeePaymentLines)
    ? rawData.socialFeePaymentLines
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          const userId =
            typeof (entry as { userId?: unknown }).userId === 'string'
              ? (entry as { userId: string }).userId
              : null;
          const month = Number((entry as { month?: unknown }).month);
          const year = Number((entry as { year?: unknown }).year);
          const amount = Number((entry as { amount?: unknown }).amount);
          if (
            !userId ||
            !Number.isInteger(month) ||
            month < 1 ||
            month > 12 ||
            !Number.isInteger(year) ||
            !Number.isFinite(amount) ||
            amount <= 0
          ) {
            return null;
          }
          const childId = (entry as { childId?: unknown }).childId;
          return {
            userId,
            childId: typeof childId === 'string' ? childId : null,
            month,
            year,
            amount: Math.round(amount),
          };
        })
        .filter(
          (
            entry
          ): entry is {
            userId: string;
            childId: string | null;
            month: number;
            year: number;
            amount: number;
          } => Boolean(entry)
        )
    : undefined;

  const activityMonthlyPaymentLines = Array.isArray(
    rawData.activityMonthlyPaymentLines
  )
    ? rawData.activityMonthlyPaymentLines
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          const activityParticipantId =
            typeof (entry as { activityParticipantId?: unknown })
              .activityParticipantId === 'string'
              ? (entry as { activityParticipantId: string })
                  .activityParticipantId
              : null;
          const activityId =
            typeof (entry as { activityId?: unknown }).activityId === 'string'
              ? (entry as { activityId: string }).activityId
              : null;
          const activityName =
            typeof (entry as { activityName?: unknown }).activityName ===
            'string'
              ? (entry as { activityName: string }).activityName
              : 'Actividad';
          const userId =
            typeof (entry as { userId?: unknown }).userId === 'string'
              ? (entry as { userId: string }).userId
              : null;
          const periodMonth = Number(
            (entry as { periodMonth?: unknown }).periodMonth
          );
          const periodYear = Number(
            (entry as { periodYear?: unknown }).periodYear
          );
          const amount = Number((entry as { amount?: unknown }).amount);
          if (
            !activityParticipantId ||
            !activityId ||
            !userId ||
            !Number.isInteger(periodMonth) ||
            periodMonth < 1 ||
            periodMonth > 12 ||
            !Number.isInteger(periodYear) ||
            !Number.isFinite(amount) ||
            amount <= 0
          ) {
            return null;
          }
          const childId = (entry as { childId?: unknown }).childId;
          const targetLabel =
            typeof (entry as { targetLabel?: unknown }).targetLabel === 'string'
              ? (entry as { targetLabel: string }).targetLabel
              : typeof childId === 'string'
                ? 'Hijo/a'
                : 'Titular';
          const label =
            typeof (entry as { label?: unknown }).label === 'string'
              ? (entry as { label: string }).label
              : `${activityName} - ${targetLabel}`;

          return {
            activityParticipantId,
            activityId,
            activityName,
            userId,
            childId: typeof childId === 'string' ? childId : null,
            targetLabel,
            amount: Math.round(amount),
            periodMonth,
            periodYear,
            label,
          };
        })
        .filter((entry): entry is ActivityMonthlyPaymentLine => Boolean(entry))
    : undefined;

  const reviews = Array.isArray(rawData.reviews)
    ? rawData.reviews
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          const action =
            typeof (entry as { action?: unknown }).action === 'string'
              ? (entry as { action: ManualPaymentReviewAction }).action
              : null;
          const by =
            typeof (entry as { by?: unknown }).by === 'string'
              ? (entry as { by: string }).by
              : null;
          const at =
            typeof (entry as { at?: unknown }).at === 'string'
              ? (entry as { at: string }).at
              : null;
          if (!action || !by || !at) return null;

          const result =
            (entry as { result?: unknown }).result === 'approved' ||
            (entry as { result?: unknown }).result === 'rejected'
              ? (entry as { result: 'approved' | 'rejected' }).result
              : undefined;
          const comment =
            typeof (entry as { comment?: unknown }).comment === 'string'
              ? (entry as { comment: string }).comment
              : undefined;

          return {
            action,
            by,
            at,
            ...(result ? { result } : {}),
            ...(comment ? { comment } : {}),
          };
        })
        .filter((entry): entry is ManualPaymentReviewEntry => Boolean(entry))
    : undefined;

  return {
    uploadedBy:
      typeof rawData.uploadedBy === 'string' ? rawData.uploadedBy : undefined,
    uploadedAt:
      typeof rawData.uploadedAt === 'string' ? rawData.uploadedAt : undefined,
    proofFileName:
      typeof rawData.proofFileName === 'string'
        ? rawData.proofFileName
        : undefined,
    proofContentType:
      typeof rawData.proofContentType === 'string'
        ? rawData.proofContentType
        : undefined,
    accountantComments:
      typeof rawData.accountantComments === 'string'
        ? rawData.accountantComments
        : undefined,
    reviewedAt:
      typeof rawData.reviewedAt === 'string' ? rawData.reviewedAt : undefined,
    reviewedBy:
      typeof rawData.reviewedBy === 'string' ? rawData.reviewedBy : undefined,
    previousRejections:
      typeof rawData.previousRejections === 'number'
        ? rawData.previousRejections
        : undefined,
    socialFeeAmount:
      typeof rawData.socialFeeAmount === 'number'
        ? rawData.socialFeeAmount
        : undefined,
    familyDiscountAmount:
      typeof rawData.familyDiscountAmount === 'number'
        ? rawData.familyDiscountAmount
        : undefined,
    socialFeeParticipants,
    socialFeePaymentLines,
    activityMonthlyPaymentLines,
    validatedItems,
    reviews,
  };
}

export function getManualPaymentReviews(
  value: Prisma.JsonValue | null | undefined
) {
  const rawData = getManualPaymentRawData(value);
  const reviews = rawData.reviews ?? [];

  if (reviews.length > 0) {
    return reviews.sort(
      (left, right) =>
        new Date(left.at).getTime() - new Date(right.at).getTime()
    );
  }

  const uploadedReview = rawData.uploadedAt
    ? [
        {
          action: 'uploaded' as const,
          by: rawData.uploadedBy ?? 'Customer',
          at: rawData.uploadedAt,
        },
      ]
    : [];

  return uploadedReview.sort(
    (left, right) => new Date(left.at).getTime() - new Date(right.at).getTime()
  );
}

export function createManualPaymentRawData(input: {
  uploadedBy: string;
  uploadedAt: Date;
  proofFileName: string;
  proofContentType: string;
  socialFeeAmount?: number;
  familyDiscountAmount?: number;
  socialFeeParticipants?: Array<{
    userId: string;
    childId: string | null;
  }>;
  socialFeePaymentLines?: Array<{
    userId: string;
    childId: string | null;
    month: number;
    year: number;
    amount: number;
  }>;
  activityMonthlyPaymentLines?: ActivityMonthlyPaymentLine[];
  validatedItems?: Array<{
    activityId: string;
    target?: string;
    targetLabel?: string;
    groupId?: string;
    activityDayId?: string;
    activityDayLabel?: string;
  }>;
}) {
  return {
    uploadedBy: input.uploadedBy,
    uploadedAt: input.uploadedAt.toISOString(),
    proofFileName: input.proofFileName,
    proofContentType: input.proofContentType,
    previousRejections: 0,
    socialFeeAmount: input.socialFeeAmount ?? 0,
    familyDiscountAmount: input.familyDiscountAmount ?? 0,
    socialFeeParticipants: input.socialFeeParticipants ?? [],
    socialFeePaymentLines: input.socialFeePaymentLines ?? [],
    activityMonthlyPaymentLines: input.activityMonthlyPaymentLines ?? [],
    validatedItems: input.validatedItems ?? [],
    reviews: [
      {
        action: 'uploaded' as const,
        by: input.uploadedBy,
        at: input.uploadedAt.toISOString(),
      },
    ],
  } satisfies ManualPaymentRawData;
}

export function appendManualPaymentReview(
  rawData: Prisma.JsonValue | null | undefined,
  review: ManualPaymentReviewEntry
) {
  const current = getManualPaymentRawData(rawData);
  const previousRejections = current.previousRejections ?? 0;

  const nextReviews = [...(current.reviews ?? []), review];

  return {
    ...current,
    reviews: nextReviews,
    accountantComments: review.comment ?? current.accountantComments,
    reviewedAt: review.at,
    reviewedBy: review.by,
    previousRejections:
      review.result === 'rejected'
        ? previousRejections + 1
        : previousRejections,
  } satisfies ManualPaymentRawData;
}

export function paymentStatusLabel(status: PaymentStatus) {
  switch (status) {
    case 'PENDING':
      return 'Pendiente';
    case 'APPROVED':
      return 'Aprobado';
    case 'REJECTED':
      return 'Rechazado';
    case 'CANCELLED':
      return 'Cancelado';
  }
}

export function paymentStatusClass(status: PaymentStatus) {
  switch (status) {
    case 'PENDING':
      return 'border-amber-200 bg-amber-100 text-amber-800';
    case 'APPROVED':
      return 'border-emerald-200 bg-emerald-100 text-emerald-700';
    case 'REJECTED':
      return 'border-rose-200 bg-rose-100 text-rose-700';
    case 'CANCELLED':
      return 'border-slate-200 bg-slate-100 text-slate-600';
  }
}
