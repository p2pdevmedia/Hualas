import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAccountingRole } from '@/lib/accounting';
import {
  buildAccountingReportEntries,
  buildAccountingCategoryTotals,
  summarizeAccounting,
} from '@/lib/accounting-summary';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const dateFilter: Prisma.DateTimeFilter = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  const [movements, manualPayments, mpPayments] = await Promise.all([
    prisma.accountingMovement.findMany({
      where: hasDateFilter ? { date: dateFilter } : undefined,
      orderBy: { date: 'desc' },
    }),
    prisma.payment.findMany({
      where: {
        provider: 'MANUAL_TRANSFER',
        status: 'APPROVED',
        ...(hasDateFilter ? { paidAt: dateFilter } : {}),
      },
      orderBy: { paidAt: 'desc' },
      include: {
        order: {
          select: {
            responsibleName: true,
            responsibleEmail: true,
            items: {
              select: {
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
  ]);

  const manualIncomePayments = manualPayments.map((payment) => ({
    id: payment.id,
    paidAt: payment.paidAt,
    amount: payment.amount,
    customerName: payment.payerName ?? payment.order.responsibleName,
    activities: payment.order.items
      .map((item) => item.activity?.name)
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

  const summary = summarizeAccounting({
    movements,
    manualPayments: manualIncomePayments,
    mpPayments: reportMpPayments,
  });
  const entries = buildAccountingReportEntries({
    movements,
    manualPayments: manualIncomePayments,
    mpPayments: reportMpPayments,
  });

  const totalMp = summary.mpIncome;

  const byCategory = buildAccountingCategoryTotals(entries);

  return NextResponse.json({
    totalIncome: summary.totalIncome,
    totalExpense: summary.totalExpense,
    netBalance: summary.netBalance,
    totalManualPayments: summary.manualIncome,
    totalMp,
    byCategory,
    movements,
    manualPayments: manualIncomePayments,
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
