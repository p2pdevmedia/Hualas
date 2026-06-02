export const MANUAL_PAYMENT_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MANUAL_PAYMENT_ACCEPTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'application/pdf',
] as const;

export const MANUAL_PAYMENT_BANK_DETAILS = {
  bankName: 'Banco Provincia Del Neuquén (BPN)',
  cbu: '0970005510009746770016',
  alias: 'clubhualas',
  account: 'Cuenta Corriente 5-974677/1',
  cuit: '30717495353',
  concept: 'Club Hualas - nombre de la actividad',
} as const;

export const MANUAL_PAYMENT_INSTRUCTIONS = [
  'Transferencia bancaria manual',
  `Banco: ${MANUAL_PAYMENT_BANK_DETAILS.bankName}`,
  `CBU: ${MANUAL_PAYMENT_BANK_DETAILS.cbu}`,
  `Alias: ${MANUAL_PAYMENT_BANK_DETAILS.alias}`,
  `Cuenta: ${MANUAL_PAYMENT_BANK_DETAILS.account}`,
  `CUIT/CUIL: ${MANUAL_PAYMENT_BANK_DETAILS.cuit}`,
  `Concepto: ${MANUAL_PAYMENT_BANK_DETAILS.concept}`,
].join('\n');

export type ManualPaymentReviewAction = 'uploaded' | 'approved' | 'rejected';

export type ManualPaymentReviewEntry = {
  action: ManualPaymentReviewAction;
  by: string;
  at: string;
  result?: 'approved' | 'rejected';
  comment?: string;
};

export type ManualPaymentSummary = {
  id: string;
  orderId: string;
  responsibleUserId: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
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
    targetId: string | null;
    targetLabel: string | null;
    participantName: string;
  }>;
  reviews: ManualPaymentReviewEntry[];
  rawData: {
    uploadedBy?: string;
    uploadedAt?: string;
    proofFileName?: string;
    proofContentType?: string;
    accountantComments?: string;
    reviewedAt?: string;
    reviewedBy?: string;
    previousRejections?: number;
    socialFeeAmount?: number;
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
    activityMonthlyPaymentLines?: Array<{
      activityParticipantId: string;
      activityId: string;
      activityName: string;
      userId: string;
      childId: string | null;
      targetLabel: string;
      amount: number;
      periodMonth: number;
      periodYear: number;
      label: string;
    }>;
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

export function paymentStatusLabel(status: ManualPaymentSummary['status']) {
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

export function paymentStatusClass(status: ManualPaymentSummary['status']) {
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

export function formatManualPaymentStatus(
  status: ManualPaymentSummary['status']
) {
  return {
    label: paymentStatusLabel(status),
    className: paymentStatusClass(status),
  };
}
