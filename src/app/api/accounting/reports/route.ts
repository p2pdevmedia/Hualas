import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getAccountingManualPaymentAmount,
  getAccountingPaymentDate,
  isAccountingRole,
} from '@/lib/accounting';
import {
  buildAccountingReportEntries,
  buildAccountingCategoryTotals,
  summarizeAccounting,
  type ProfessorPaymentLike,
} from '@/lib/accounting-summary';

function parseDateInput(value: string, endOfDay = false) {
  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month || !day) return null;

  return endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const fromDate = from ? parseDateInput(from) : null;
  const toDate = to ? parseDateInput(to, true) : null;
  const dateFilter: Prisma.DateTimeFilter = {};
  if (fromDate) dateFilter.gte = fromDate;
  if (toDate) dateFilter.lte = toDate;
  const hasDateFilter = Boolean(fromDate || toDate);

  const [movements, manualPayments, mpPayments, paidProfessorPayments] =
    await Promise.all([
      prisma.accountingMovement.findMany({
        where: hasDateFilter ? { date: dateFilter } : undefined,
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
              responsibleEmail: true,
              total: true,
              items: {
                select: {
                  description: true,
                  billableConcept: {
                    select: {
                      code: true,
                    },
                  },
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
          ...(hasDateFilter ? { receiptDate: dateFilter } : {}),
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
          ...(hasDateFilter ? { paidAt: dateFilter } : {}),
        },
        orderBy: { paidAt: 'desc' },
        include: {
          professorProfile: {
            include: { user: { select: { name: true, lastName: true } } },
          },
        },
      }),
    ]);

  const manualIncomePayments = manualPayments
    .filter((payment) => {
      const paymentDate = getAccountingPaymentDate(payment);
      if (!paymentDate) return false;
      if (!hasDateFilter) return true;
      if (fromDate && paymentDate < fromDate) return false;
      if (toDate && paymentDate > toDate) return false;
      return true;
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

  const reportMpPayments = mpPayments.map((payment) => ({
    id: payment.id,
    receiptDate: payment.receiptDate,
    amount: payment.activity.price * 100,
    participantName: payment.child
      ? `${payment.child.name} ${payment.child.lastName ?? ''}`.trim()
      : `${payment.user.name ?? ''} ${payment.user.lastName ?? ''}`.trim(),
    activityName: payment.activity.name,
    receipt: payment.receipt,
  }));

  const reportProfessorPayments: ProfessorPaymentLike[] =
    paidProfessorPayments.map((p) => ({
      id: p.id,
      paidAt: p.paidAt,
      amount: p.amount,
      professorName:
        `${p.professorProfile.user.name ?? ''} ${p.professorProfile.user.lastName ?? ''}`.trim() ||
        'Profesor',
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

  const totalMp = summary.mpIncome;

  const byCategory = buildAccountingCategoryTotals(entries);

  return NextResponse.json({
    totalIncome: summary.totalIncome,
    totalExpense: summary.totalExpense,
    netBalance: summary.netBalance,
    totalManualPayments: summary.manualIncome,
    totalMp,
    totalProfessorExpense: summary.professorExpense,
    byCategory,
    movements,
    manualPayments: manualIncomePayments,
    professorPayments: reportProfessorPayments,
    mpPayments: mpPayments.map((p) => ({
      id: p.id,
      receiptDate: p.receiptDate,
      receipt: p.receipt,
      activityName: p.activity.name,
      amount: p.activity.price * 100,
      participantName: p.child
        ? `${p.child.name} ${p.child.lastName ?? ''}`.trim()
        : `${p.user.name ?? ''} ${p.user.lastName ?? ''}`.trim(),
    })),
    entries,
  });
}
