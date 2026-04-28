import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Box, Flex, Text, Heading, Container } from '@radix-ui/themes';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import {
  formatAccountingDate,
  formatAmount,
  formatPersonName,
  isAccountingRole,
  movementTypeClass,
  movementTypeLabel,
} from '@/lib/accounting';
import { Button } from '@/components/ui/button';
import { FileIcon, ArrowRightIcon } from '@radix-ui/react-icons';

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export default async function AccountingDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole(session?.user?.role)) {
    redirect('/');
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [monthMovements, recentMovements, monthPayments] = await Promise.all([
    prisma.accountingMovement.findMany({
      where: {
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    }),
    prisma.accountingMovement.findMany({
      orderBy: { date: 'desc' },
      take: 10,
      include: {
        createdBy: {
          select: { name: true, lastName: true },
        },
      },
    }),
    prisma.activityParticipant.findMany({
      where: {
        receipt: { not: null },
        receiptDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      orderBy: { receiptDate: 'desc' },
      include: {
        activity: { select: { name: true, price: true } },
        user: { select: { name: true, lastName: true } },
        child: { select: { name: true, lastName: true } },
      },
    }),
  ]);

  const totalIncome = monthMovements
    .filter((movement) => movement.type === 'INCOME')
    .reduce((sum, movement) => sum + movement.amount, 0);
  const totalExpense = monthMovements
    .filter((movement) => movement.type === 'EXPENSE')
    .reduce((sum, movement) => sum + movement.amount, 0);
  const totalMp = monthPayments.reduce(
    (sum, payment) => sum + payment.activity.price * 100,
    0
  );
  const recentPayments = monthPayments.slice(0, 5);

  return (
    <Container>
      <div className="space-y-6">
        <Box className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Ingresos del mes',
              value: formatAmount(totalIncome),
              helper: `${formatAccountingDate(monthStart)} - ${formatAccountingDate(monthEnd)}`,
            },
            {
              label: 'Egresos del mes',
              value: formatAmount(totalExpense),
              helper: 'Movimientos manuales registrados',
            },
            {
              label: 'Balance neto',
              value: formatAmount(totalIncome - totalExpense),
              helper: 'Ingresos menos egresos',
            },
            {
              label: 'Cobrado por MP',
              value: formatAmount(totalMp),
              helper: 'Pagos aprobados del mes',
            },
          ].map((card) => (
            <Box
              key={card.label}
              className="rounded-2xl border bg-card p-5 shadow-sm"
            >
              <Text size="2" color="gray">
                {card.label}
              </Text>
              <Heading size="8" className="mt-2">
                {card.value}
              </Heading>
              <Text size="1" color="gray" className="mt-1">
                {card.helper}
              </Text>
            </Box>
          ))}
        </Box>

        <Box className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Box className="rounded-2xl border bg-card p-5 shadow-sm">
            <Flex
              justify="between"
              align="start"
              gap="3"
              mb="4"
              className="flex-col sm:flex-row"
            >
              <Box>
                <Heading size="6">Últimos movimientos</Heading>
                <Text size="2" color="gray">
                  Últimos 10 registros manuales.
                </Text>
              </Box>
              <Button asChild variant="outline">
                <Link href="/accounting/movements">
                  Ver todos
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </Flex>

            <Box className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Fecha</th>
                    <th className="py-2 pr-4 font-medium">Tipo</th>
                    <th className="py-2 pr-4 font-medium">Categoría</th>
                    <th className="py-2 pr-4 font-medium">Descripción</th>
                    <th className="py-2 pr-4 font-medium">Monto</th>
                    <th className="py-2 pr-4 font-medium">Recibo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentMovements.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-10 text-center text-muted-foreground"
                      >
                        No hay movimientos cargados.
                      </td>
                    </tr>
                  ) : (
                    recentMovements.map((movement) => (
                      <tr key={movement.id}>
                        <td className="py-3 pr-4">
                          {formatAccountingDate(movement.date)}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${movementTypeClass(movement.type)}`}
                          >
                            {movementTypeLabel(movement.type)}
                          </span>
                        </td>
                        <td className="py-3 pr-4">{movement.category}</td>
                        <td className="py-3 pr-4">{movement.description}</td>
                        <td className="py-3 pr-4 font-medium">
                          {formatAmount(movement.amount)}
                        </td>
                        <td className="py-3 pr-4">
                          {movement.receiptImage ? (
                            <a
                              href={movement.receiptImage}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <FileIcon className="h-4 w-4" />
                              Ver
                            </a>
                          ) : (
                            <Text color="gray">-</Text>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Box>
          </Box>

          <Box className="rounded-2xl border bg-card p-5 shadow-sm">
            <Flex
              justify="between"
              align="start"
              gap="3"
              mb="4"
              className="flex-col sm:flex-row"
            >
              <Box>
                <Heading size="6">Pagos MP recientes</Heading>
                <Text size="2" color="gray">
                  Últimos 5 pagos con comprobante.
                </Text>
              </Box>
              <Button asChild variant="outline">
                <Link href="/accounting/payments">
                  Ver todos
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </Flex>

            <Box className="space-y-3">
              {recentPayments.length === 0 ? (
                <Text size="2" color="gray" className="py-8 text-center">
                  No hay pagos para mostrar.
                </Text>
              ) : (
                recentPayments.map((payment) => (
                  <Box
                    key={payment.id}
                    className="rounded-xl border bg-muted/20 p-4"
                  >
                    <Flex justify="between" align="start" gap="3">
                      <Box className="space-y-1">
                        <Text className="font-medium">
                          {formatPersonName(payment.child ?? payment.user)}
                        </Text>
                        <Text size="2" color="gray">
                          {payment.activity.name}
                        </Text>
                      </Box>
                      <Text className="font-semibold">
                        {formatAmount(payment.activity.price * 100)}
                      </Text>
                    </Flex>
                    <Flex
                      justify="between"
                      align="center"
                      gap="3"
                      className="mt-2 text-xs text-muted-foreground"
                    >
                      <Text size="1" color="gray">
                        {payment.receiptDate
                          ? formatAccountingDate(payment.receiptDate)
                          : 'Sin fecha'}
                      </Text>
                      <Text size="1" color="gray">
                        {payment.receipt ? 'Con recibo' : 'Sin recibo'}
                      </Text>
                    </Flex>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        </Box>
      </div>
    </Container>
  );
}
