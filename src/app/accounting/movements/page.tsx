import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Heading, Text, Flex, Container } from '@radix-ui/themes';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { isAccountingRole } from '@/lib/accounting';
import { Button } from '@/components/ui/button';
import MovementsTable from './movements-table';

type SearchParams = {
  type?: string;
  from?: string;
  to?: string;
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
    include: {
      createdBy: {
        select: { name: true, lastName: true },
      },
    },
  });

  return (
    <Container>
      <div className="space-y-6">
        <Flex
          direction="column"
          gap="3"
          justify="between"
          align="start"
          className="sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <Heading size="8">Movimientos</Heading>
            <Text size="2" color="gray">
              Filtra ingresos y egresos manuales del club.
            </Text>
          </div>
          <Button asChild>
            <Link href="/accounting/movements/new">Nuevo movimiento</Link>
          </Button>
        </Flex>

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
            createdBy:
              `${movement.createdBy.name ?? ''} ${movement.createdBy.lastName ?? ''}`.trim(),
          }))}
          initialFilters={{ type, from, to }}
        />
      </div>
    </Container>
  );
}
