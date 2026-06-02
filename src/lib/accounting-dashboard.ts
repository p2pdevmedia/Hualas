import {
  formatPersonName,
  getAccountingProfessorProfileHref,
  type MovementType,
} from './accounting';
import { buildProfessorInvoiceFileUrl } from './blob-urls';

export type RecentAccountingEntry = {
  id: string;
  date: Date;
  origin: 'MOVEMENT' | 'MANUAL_PAYMENT' | 'MP_PAYMENT' | 'PROFESSOR_PAYMENT';
  type: MovementType;
  category: string;
  description: string;
  amount: number;
  receiptLabel: string | null;
  receiptHref: string | null;
  actionLabel: string;
  actionHref: string;
  personHref?: string | null;
  paymentStatus?: string | null;
};

export type ProfessorPaymentDashboardLike = {
  id: string;
  paidAt: Date | string | null;
  periodMonth: number;
  periodYear: number;
  amount: number;
  professorProfile: {
    user: {
      id: string;
      name?: string | null;
      lastName?: string | null;
    };
  };
  invoice?: {
    id: string;
    originalName: string;
  } | null;
  activity?: {
    name: string;
  } | null;
};

function toDate(value: Date | string | null) {
  if (!value) return new Date(0);
  return value instanceof Date ? value : new Date(value);
}

function formatPeriod(month: number, year: number) {
  return `${String(month).padStart(2, '0')}/${year}`;
}

export function buildProfessorPaymentDashboardEntries(
  payments: ProfessorPaymentDashboardLike[]
): RecentAccountingEntry[] {
  return payments.map((payment) => {
    const professorHref = getAccountingProfessorProfileHref(
      payment.professorProfile.user.id
    );
    const descriptionParts = [
      formatPersonName(payment.professorProfile.user),
      payment.activity?.name,
      formatPeriod(payment.periodMonth, payment.periodYear),
    ].filter(Boolean);

    return {
      id: payment.id,
      date: toDate(payment.paidAt),
      origin: 'PROFESSOR_PAYMENT',
      type: 'EXPENSE',
      category: 'Honorarios profesores',
      description: descriptionParts.join(' · '),
      amount: payment.amount,
      receiptLabel: payment.invoice?.originalName ?? null,
      receiptHref: payment.invoice
        ? buildProfessorInvoiceFileUrl(payment.invoice.id)
        : null,
      actionLabel: 'Ver',
      actionHref: professorHref,
      personHref: professorHref,
    };
  });
}
