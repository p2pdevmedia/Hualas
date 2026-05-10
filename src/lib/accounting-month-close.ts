import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  getAccountingManualPaymentAmount,
  getAccountingPaymentDate,
} from '@/lib/accounting';
import {
  buildAccountingReportEntries,
  buildAccountingCategoryTotals,
  summarizeAccounting,
  type ProfessorPaymentLike,
} from '@/lib/accounting-summary';

export type AccountingMonthCloseActivity = {
  activityId: string;
  activityName: string;
  totalParticipants: number;
  paidParticipants: number;
  pendingParticipants: number;
  paidAmount: number;
};

export type AccountingMonthCloseSnapshot = {
  period: {
    month: number;
    year: number;
    from: string;
    to: string;
  };
  balances: {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    positiveBalance: number;
    movementIncome: number;
    movementExpense: number;
    manualIncome: number;
    mercadoPagoIncome: number;
    professorExpense: number;
  };
  activityReports: AccountingMonthCloseActivity[];
  categoryTotals: Record<string, { income: number; expense: number }>;
  entriesCount: number;
};

export function getAccountingPeriodBounds(month: number, year: number) {
  return {
    periodStart: new Date(year, month - 1, 1, 0, 0, 0, 0),
    periodEnd: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

function parsePersonName(person: {
  name?: string | null;
  lastName?: string | null;
}) {
  return `${person.name ?? ''} ${person.lastName ?? ''}`.trim() || 'Sin nombre';
}

function isDateInRange(
  value: Date | string | null | undefined,
  from: Date,
  to: Date
) {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(date.getTime()) && date >= from && date <= to;
}

export async function buildAccountingMonthCloseSnapshot({
  month,
  year,
}: {
  month: number;
  year: number;
}): Promise<AccountingMonthCloseSnapshot> {
  const { periodStart, periodEnd } = getAccountingPeriodBounds(month, year);
  const dateFilter: Prisma.DateTimeFilter = {
    gte: periodStart,
    lte: periodEnd,
  };

  const [
    movements,
    manualPayments,
    mpParticipants,
    paidProfessorPayments,
    activities,
  ] = await Promise.all([
    prisma.accountingMovement.findMany({
      where: { date: dateFilter },
      orderBy: { date: 'desc' },
    }),
    prisma.payment.findMany({
      where: {
        provider: 'MANUAL_TRANSFER',
        status: 'APPROVED',
      },
      orderBy: { paidAt: 'desc' },
      select: {
        id: true,
        paidAt: true,
        updatedAt: true,
        createdAt: true,
        amount: true,
        receiptUrl: true,
        payerName: true,
        order: {
          select: {
            responsibleName: true,
            total: true,
            items: {
              select: {
                description: true,
                billableConcept: { select: { code: true } },
                activity: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.activityParticipant.findMany({
      where: {
        receipt: { not: null },
        receiptDate: dateFilter,
      },
      include: {
        activity: { select: { name: true, price: true } },
        user: { select: { name: true, lastName: true } },
        child: { select: { name: true, lastName: true } },
      },
    }),
    prisma.professorPayment.findMany({
      where: {
        status: 'PAID',
        paidAt: dateFilter,
      },
      orderBy: { paidAt: 'desc' },
      include: {
        professorProfile: {
          include: { user: { select: { name: true, lastName: true } } },
        },
      },
    }),
    prisma.activity.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        price: true,
        participants: {
          select: {
            id: true,
            receipt: true,
            receiptDate: true,
            payments: {
              where: { paidAt: dateFilter },
              select: { id: true, amount: true },
            },
          },
        },
      },
    }),
  ]);

  const manualIncomePayments = manualPayments
    .filter((payment) => {
      const paymentDate = getAccountingPaymentDate(payment);
      return isDateInRange(paymentDate, periodStart, periodEnd);
    })
    .map((payment) => ({
      id: payment.id,
      paidAt: payment.paidAt ?? payment.updatedAt ?? payment.createdAt,
      amount: getAccountingManualPaymentAmount(payment),
      customerName: payment.payerName ?? payment.order.responsibleName,
      activities: payment.order.items
        .filter((item) => item.billableConcept.code === 'ACTIVITY_FEE')
        .map((item) => item.activity?.name ?? item.description)
        .filter((name): name is string => Boolean(name)),
      receiptUrl: payment.receiptUrl,
    }));

  const reportMpPayments = mpParticipants.map((payment) => ({
    id: payment.id,
    receiptDate: payment.receiptDate,
    amount: payment.activity.price,
    participantName: payment.child
      ? parsePersonName(payment.child)
      : parsePersonName(payment.user),
    activityName: payment.activity.name,
    receipt: payment.receipt,
  }));

  const reportProfessorPayments: ProfessorPaymentLike[] =
    paidProfessorPayments.map((payment) => ({
      id: payment.id,
      paidAt: payment.paidAt,
      amount: payment.amount,
      professorName: parsePersonName(payment.professorProfile.user),
    }));

  const summary = summarizeAccounting({
    movements,
    manualPayments: manualIncomePayments,
    mpPayments: reportMpPayments,
    professorPayments: reportProfessorPayments,
  });
  const entries = buildAccountingReportEntries({
    movements,
    manualPayments: manualIncomePayments,
    mpPayments: reportMpPayments,
    professorPayments: reportProfessorPayments,
  });

  const movementIncome = movements
    .filter((movement) => movement.type === 'INCOME')
    .reduce((sum, movement) => sum + movement.amount, 0);
  const movementExpense = movements
    .filter((movement) => movement.type === 'EXPENSE')
    .reduce((sum, movement) => sum + movement.amount, 0);

  const activityReports = activities.map((activity) => {
    const paidParticipants = activity.participants.filter(
      (participant) =>
        participant.payments.length > 0 ||
        (Boolean(participant.receipt) &&
          isDateInRange(participant.receiptDate, periodStart, periodEnd))
    );
    const paidAmount = activity.participants.reduce((sum, participant) => {
      const registeredPaymentsAmount = participant.payments.reduce(
        (paymentSum, payment) => paymentSum + payment.amount,
        0
      );

      if (registeredPaymentsAmount > 0) return sum + registeredPaymentsAmount;
      if (
        participant.receipt &&
        isDateInRange(participant.receiptDate, periodStart, periodEnd)
      ) {
        return sum + activity.price;
      }

      return sum;
    }, 0);

    return {
      activityId: activity.id,
      activityName: activity.name,
      totalParticipants: activity.participants.length,
      paidParticipants: paidParticipants.length,
      pendingParticipants: Math.max(
        activity.participants.length - paidParticipants.length,
        0
      ),
      paidAmount,
    };
  });

  return {
    period: {
      month,
      year,
      from: periodStart.toISOString(),
      to: periodEnd.toISOString(),
    },
    balances: {
      totalIncome: summary.totalIncome,
      totalExpense: summary.totalExpense,
      netBalance: summary.netBalance,
      positiveBalance: Math.max(summary.netBalance, 0),
      movementIncome,
      movementExpense,
      manualIncome: summary.manualIncome,
      mercadoPagoIncome: summary.mpIncome,
      professorExpense: summary.professorExpense,
    },
    activityReports,
    categoryTotals: buildAccountingCategoryTotals(entries),
    entriesCount: entries.length,
  };
}
