import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAccountingRole } from '@/lib/accounting';
import { movementSchema } from '@/lib/validations/accounting';
import { notifyPaymentManualCreated } from '@/lib/notifications/notification-service';
import { buildAccountingSimilarityCondition } from '@/lib/accounting-search';

type MovementIdRow = {
  id: string;
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as 'INCOME' | 'EXPENSE' | null;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const q = searchParams.get('q')?.trim() ?? '';

  const filters: Prisma.Sql[] = [];
  if (type) filters.push(Prisma.sql`m."type"::text = ${type}`);
  if (from || to) {
    if (from) filters.push(Prisma.sql`m."date" >= ${new Date(from)}`);
    if (to) filters.push(Prisma.sql`m."date" <= ${new Date(to)}`);
  }
  if (q) {
    filters.push(
      buildAccountingSimilarityCondition(q, [
        Prisma.sql`m."category"`,
        Prisma.sql`m."description"`,
        Prisma.sql`m."receiptNumber"`,
        Prisma.sql`u."name"`,
        Prisma.sql`u."lastName"`,
        Prisma.sql`concat_ws(' ', u."name", u."lastName")`,
        Prisma.sql`u."email"`,
      ])
    );
  }
  const whereSql =
    filters.length > 0 ? Prisma.join(filters, ' AND ') : Prisma.sql`TRUE`;

  const movementIdRows = await prisma.$queryRaw<MovementIdRow[]>`
    SELECT m."id"
    FROM "AccountingMovement" m
    JOIN "User" u ON u."id" = m."createdById"
    WHERE ${whereSql}
    ORDER BY m."date" DESC
  `;
  const movementIds = movementIdRows.map((row) => row.id);
  const movementOrder = new Map(movementIds.map((id, index) => [id, index]));
  const movements =
    movementIds.length > 0
      ? (
          await prisma.accountingMovement.findMany({
            where: { id: { in: movementIds } },
            include: { createdBy: { select: { name: true, lastName: true } } },
          })
        ).sort(
          (left, right) =>
            (movementOrder.get(left.id) ?? 0) -
            (movementOrder.get(right.id) ?? 0)
        )
      : [];

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
