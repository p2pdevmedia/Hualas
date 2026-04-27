import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAccountingRole } from '@/lib/accounting';

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

  const [movements, mpPayments] = await Promise.all([
    prisma.accountingMovement.findMany({
      where: hasDateFilter ? { date: dateFilter } : undefined,
      orderBy: { date: 'desc' },
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

  const totalIncome = movements
    .filter((m) => m.type === 'INCOME')
    .reduce((s, m) => s + m.amount, 0);
  const totalExpense = movements
    .filter((m) => m.type === 'EXPENSE')
    .reduce((s, m) => s + m.amount, 0);
  const totalMp = mpPayments.reduce((s, p) => s + p.activity.price * 100, 0);

  const byCategory: Record<string, { income: number; expense: number }> = {};
  for (const m of movements) {
    if (!byCategory[m.category])
      byCategory[m.category] = { income: 0, expense: 0 };
    if (m.type === 'INCOME') byCategory[m.category].income += m.amount;
    else byCategory[m.category].expense += m.amount;
  }

  return NextResponse.json({
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    totalMp,
    byCategory,
    movements,
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
  });
}
