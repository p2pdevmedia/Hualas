import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAccountingRole } from '@/lib/accounting';
import { prisma } from '@/lib/prisma';
import {
  buildAccountingMonthCloseSnapshot,
  getAccountingPeriodBounds,
} from '@/lib/accounting-month-close';

function currentPeriod() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

function parsePeriod(value: unknown) {
  if (!value || typeof value !== 'object') return currentPeriod();

  const input = value as { month?: unknown; year?: unknown };
  const month = Number(input.month);
  const year = Number(input.year);

  if (
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100
  ) {
    return null;
  }

  return { month, year };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const latest = await prisma.accountingMonthClose.findFirst({
    orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    include: {
      createdBy: { select: { name: true, lastName: true, email: true } },
    },
  });

  return NextResponse.json({ latest });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  if (!userId || !isAccountingRole(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const period = parsePeriod(body);

  if (!period) {
    return NextResponse.json(
      { error: 'El período indicado no es válido' },
      { status: 400 }
    );
  }

  const { periodStart, periodEnd } = getAccountingPeriodBounds(
    period.month,
    period.year
  );
  const snapshot = await buildAccountingMonthCloseSnapshot(period);

  const close = await prisma.accountingMonthClose.upsert({
    where: {
      periodYear_periodMonth: {
        periodYear: period.year,
        periodMonth: period.month,
      },
    },
    create: {
      periodMonth: period.month,
      periodYear: period.year,
      periodStart,
      periodEnd,
      totalIncome: snapshot.balances.totalIncome,
      totalExpense: snapshot.balances.totalExpense,
      netBalance: snapshot.balances.netBalance,
      positiveBalance: snapshot.balances.positiveBalance,
      activitySnapshot: snapshot,
      createdById: userId,
    },
    update: {
      periodStart,
      periodEnd,
      totalIncome: snapshot.balances.totalIncome,
      totalExpense: snapshot.balances.totalExpense,
      netBalance: snapshot.balances.netBalance,
      positiveBalance: snapshot.balances.positiveBalance,
      activitySnapshot: snapshot,
      createdById: userId,
    },
    include: {
      createdBy: { select: { name: true, lastName: true, email: true } },
    },
  });

  return NextResponse.json({ close });
}
