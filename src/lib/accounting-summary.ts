import type { MovementType } from './accounting';

export type AccountingMovementLike = {
  id: string;
  date: Date | string;
  amount: number;
  type: MovementType;
  category: string;
  description: string;
  receiptNumber?: string | null;
};

export type ManualPaymentLike = {
  id: string;
  paidAt: Date | string | null;
  amount: number;
  customerName: string;
  activities: string[];
  receiptUrl?: string | null;
};

export type MercadoPagoLike = {
  id: string;
  receiptDate: Date | string | null;
  amount: number;
  participantName: string;
  activityName: string;
  receipt?: string | null;
};

export type ProfessorPaymentLike = {
  id: string;
  paidAt: Date | string | null;
  amount: number;
  professorName: string;
};

export type AccountingReportEntry = {
  id: string;
  date: string;
  source:
    | 'Movimiento manual'
    | 'Pago manual'
    | 'Mercado Pago'
    | 'Pago a profesor';
  type: MovementType;
  category: string;
  description: string;
  amount: number;
  reference: string | null;
};

export type AccountingSummaryInput = {
  movements: AccountingMovementLike[];
  manualPayments: ManualPaymentLike[];
  mpPayments: MercadoPagoLike[];
  professorPayments?: ProfessorPaymentLike[];
};

export type AccountingSummary = {
  movementIncome: number;
  movementExpense: number;
  manualIncome: number;
  mpIncome: number;
  professorExpense: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
};

export type AccountingCategoryTotals = Record<
  string,
  {
    income: number;
    expense: number;
  }
>;

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function sumAmounts(items: Array<{ amount: number }>) {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

export function buildAccountingCategoryTotals(
  entries: Array<Pick<AccountingReportEntry, 'category' | 'type' | 'amount'>>
): AccountingCategoryTotals {
  const totals: AccountingCategoryTotals = {};

  for (const entry of entries) {
    if (!totals[entry.category]) {
      totals[entry.category] = { income: 0, expense: 0 };
    }

    if (entry.type === 'INCOME') {
      totals[entry.category].income += entry.amount;
    } else {
      totals[entry.category].expense += entry.amount;
    }
  }

  return totals;
}

export function summarizeAccounting({
  movements,
  manualPayments,
  mpPayments,
  professorPayments = [],
}: AccountingSummaryInput): AccountingSummary {
  const movementIncome = sumAmounts(
    movements.filter((movement) => movement.type === 'INCOME')
  );
  const movementExpense = sumAmounts(
    movements.filter((movement) => movement.type === 'EXPENSE')
  );
  const manualIncome = sumAmounts(manualPayments);
  const mpIncome = sumAmounts(mpPayments);
  const professorExpense = sumAmounts(professorPayments);

  return {
    movementIncome,
    movementExpense,
    manualIncome,
    mpIncome,
    professorExpense,
    totalIncome: movementIncome + manualIncome + mpIncome,
    totalExpense: movementExpense + professorExpense,
    netBalance:
      movementIncome +
      manualIncome +
      mpIncome -
      movementExpense -
      professorExpense,
  };
}

export function buildAccountingReportEntries({
  movements,
  manualPayments,
  mpPayments,
  professorPayments = [],
}: AccountingSummaryInput): AccountingReportEntry[] {
  const entries: AccountingReportEntry[] = [
    ...movements.map((movement) => ({
      id: `movement:${movement.id}`,
      date: toIsoDate(movement.date) ?? new Date(0).toISOString(),
      source: 'Movimiento manual' as const,
      type: movement.type,
      category: movement.category,
      description: movement.description,
      amount: movement.amount,
      reference: movement.receiptNumber ?? null,
    })),
    ...manualPayments.map((payment) => ({
      id: `manual:${payment.id}`,
      date: toIsoDate(payment.paidAt) ?? new Date(0).toISOString(),
      source: 'Pago manual' as const,
      type: 'INCOME' as const,
      category: 'Pagos manuales',
      description:
        payment.activities.length > 0
          ? `${payment.customerName} · ${payment.activities.join(' / ')}`
          : payment.customerName,
      amount: payment.amount,
      reference: payment.receiptUrl ?? null,
    })),
    ...mpPayments.map((payment) => ({
      id: `mp:${payment.id}`,
      date: toIsoDate(payment.receiptDate) ?? new Date(0).toISOString(),
      source: 'Mercado Pago' as const,
      type: 'INCOME' as const,
      category: 'Mercado Pago',
      description: `${payment.activityName} · ${payment.participantName}`,
      amount: payment.amount,
      reference: payment.receipt ?? null,
    })),
    ...professorPayments.map((payment) => ({
      id: `professor:${payment.id}`,
      date: toIsoDate(payment.paidAt) ?? new Date(0).toISOString(),
      source: 'Pago a profesor' as const,
      type: 'EXPENSE' as const,
      category: 'Honorarios profesores',
      description: payment.professorName,
      amount: payment.amount,
      reference: null,
    })),
  ];

  return entries.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}
