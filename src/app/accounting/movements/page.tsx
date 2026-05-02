import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { isAccountingRole } from '@/lib/accounting';
import { Button } from '@/components/ui/button';
import MovementsTable from './movements-table';
import { buildAccountingMovementReceiptUrl } from '@/lib/blob-urls';

type SearchParams = {
  type?: string;
  from?: string;
  to?: string;
  q?: string;
};

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole(session?.user?.role)) {
    redirect('/');
  }

  const type =
    searchParams.type === 'INCOME' || searchParams.type === 'EXPENSE'
      ? searchParams.type
      : '';
  const from = searchParams.from ?? '';
  const to = searchParams.to ?? '';
  const q = searchParams.q?.trim() ?? '';

  const where: Prisma.AccountingMovementWhereInput = {};
  if (type) where.type = type;
  if (from || to) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
    where.date = dateFilter;
  }
  if (q) {
    where.OR = [
      { category: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { createdBy: { name: { contains: q, mode: 'insensitive' } } },
      { createdBy: { lastName: { contains: q, mode: 'insensitive' } } },
      { createdBy: { email: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const movements = await prisma.accountingMovement.findMany({
    where,
    orderBy: { date: 'desc' },
    include: {
      createdBy: {
        select: { id: true, name: true, lastName: true },
      },
    },
  });

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
          <Link href="/accounting/movements/new">Nuevo movimiento</Link>
        </Button>
      </div>

      <MovementsTable
        movements={movements.map((movement) => ({
          id: movement.id,
          date: movement.date.toISOString(),
          amount: movement.amount,
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
