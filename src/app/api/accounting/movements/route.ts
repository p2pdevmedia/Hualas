import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAccountingRole } from '@/lib/accounting';
import { movementSchema } from '@/lib/validations/accounting';
import { notifyPaymentManualCreated } from '@/lib/notifications/notification-service';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as 'INCOME' | 'EXPENSE' | null;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: Prisma.AccountingMovementWhereInput = {};
  if (type) where.type = type;
  if (from || to) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
    where.date = dateFilter;
  }

  const movements = await prisma.accountingMovement.findMany({
    where,
    orderBy: { date: 'desc' },
    include: { createdBy: { select: { name: true, lastName: true } } },
  });

  return NextResponse.json(movements);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = movementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const movement = await prisma.accountingMovement.create({
    data: {
      date: new Date(parsed.data.date),
      amount: parsed.data.amount,
      type: parsed.data.type,
      category: parsed.data.category,
      description: parsed.data.description,
      receiptNumber: parsed.data.receiptNumber,
      createdById: (session!.user as any).id,
    },
  });

  notifyPaymentManualCreated(movement.id).catch((err) =>
    console.error('[notifications] notifyPaymentManualCreated failed', err)
  );

  return NextResponse.json(movement, { status: 201 });
}
