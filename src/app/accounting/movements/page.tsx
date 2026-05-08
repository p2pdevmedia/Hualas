import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import {
  isAccountingRole,
  normalizeAccountingMovementAmount,
} from '@/lib/accounting';
import { Button } from '@/components/ui/button';
import MovementsTable from './movements-table';
import { buildAccountingMovementReceiptUrl } from '@/lib/blob-urls';
import { buildAccountingSimilarityCondition } from '@/lib/accounting-search';

type SearchParams = {
  type?: string;
  from?: string;
  to?: string;
  q?: string;
};

type MovementIdRow = {
  id: string;
};

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Auth gating happens in the parent /accounting layout.
  await getServerSession(authOptions);

  const type =
    searchParams.type === 'INCOME' || searchParams.type === 'EXPENSE'
      ? searchParams.type
      : '';
  const from = searchParams.from ?? '';
  const to = searchParams.to ?? '';
  const q = searchParams.q?.trim() ?? '';

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
            include: {
              createdBy: {
                select: { id: true, name: true, lastName: true },
              },
            },
          })
        ).sort(
          (left, right) =>
            (movementOrder.get(left.id) ?? 0) -
            (movementOrder.get(right.id) ?? 0)
        )
      : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Movimientos</h2>
          <p className="text-sm text-muted-foreground">
            Filtra ingresos y egresos manuales del club.
          </p>
        </div>
        <Button asChild>
          <Link href="/accounting/movements/new" prefetch={true}>
            Nuevo movimiento
          </Link>
        </Button>
      </div>

      <MovementsTable
        movements={movements.map((movement) => ({
          id: movement.id,
          date: movement.date.toISOString(),
          amount: normalizeAccountingMovementAmount(movement),
          type: movement.type,
          category: movement.category,
          description: movement.description,
          receiptNumber: movement.receiptNumber,
          receiptImage: movement.receiptImage,
          receiptImageUrl: movement.receiptImage
            ? buildAccountingMovementReceiptUrl(movement.id)
            : null,
          createdBy: {
            id: movement.createdBy.id,
            name: `${movement.createdBy.name ?? ''} ${movement.createdBy.lastName ?? ''}`.trim(),
          },
        }))}
        initialFilters={{ type, from, to, q }}
      />
    </div>
  );
}
