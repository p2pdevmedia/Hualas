import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Heading, Text, Flex, Box, Container } from '@radix-ui/themes';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  formatAccountingDate,
  formatAmount,
  formatPersonName,
  isAccountingRole,
} from '@/lib/accounting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Search } from 'lucide-react';

type SearchParams = {
  from?: string;
  to?: string;
  activity?: string;
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole(session?.user?.role)) {
    redirect('/');
  }

  const from = searchParams.from ?? '';
  const to = searchParams.to ?? '';
  const activity = searchParams.activity ?? '';

  const where: Prisma.ActivityParticipantWhereInput = {
    receipt: { not: null },
  };
  if (from || to) {
    const receiptDate: Prisma.DateTimeFilter = {};
    if (from) receiptDate.gte = new Date(from);
    if (to) receiptDate.lte = new Date(to);
    where.receiptDate = receiptDate;
  }
  if (activity) {
    where.activity = {
      name: {
        contains: activity,
        mode: 'insensitive',
      },
    };
  }

  const payments = await prisma.activityParticipant.findMany({
    where,
    orderBy: { receiptDate: 'desc' },
    include: {
      activity: { select: { name: true, price: true } },
      user: { select: { name: true, lastName: true } },
      child: { select: { name: true, lastName: true } },
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
            <Heading size="8">Pagos MP</Heading>
            <Text size="2" color="gray">
              Registro de participantes con recibo aprobado.
            </Text>
          </div>
          <Button asChild variant="outline">
            <Link href="/accounting/reports">
              Ir a reportes
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </Flex>

        <Box className="rounded-2xl border bg-card p-4 shadow-sm">
          <form>
            <Box className="grid gap-3 md:grid-cols-4">
              <label className="space-y-1 text-sm">
                <Text size="2" weight="medium">
                  Desde
                </Text>
                <input
                  type="date"
                  name="from"
                  defaultValue={from}
                  className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="space-y-1 text-sm">
                <Text size="2" weight="medium">
                  Hasta
                </Text>
                <input
                  type="date"
                  name="to"
                  defaultValue={to}
                  className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="space-y-1 text-sm md:col-span-2">
                <Text size="2" weight="medium">
                  Actividad
                </Text>
                <input
                  type="text"
                  name="activity"
                  defaultValue={activity}
                  placeholder="Nombre de actividad"
                  className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
            </Box>
            <Flex gap="2" className="mt-3 flex-wrap">
              <Button type="submit">
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
              <Button asChild variant="outline">
                <Link href="/accounting/payments">Limpiar</Link>
              </Button>
            </Flex>
          </form>
        </Box>

        <Box className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-muted/20 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Actividad</th>
              <th className="px-4 py-3 font-medium">Participante</th>
              <th className="px-4 py-3 font-medium">Monto</th>
              <th className="px-4 py-3 font-medium">Nro. recibo</th>
              <th className="px-4 py-3 font-medium">Comprobante</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payments.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No hay pagos con esos filtros.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="align-top">
                  <td className="px-4 py-3">
                    {payment.receiptDate
                      ? formatAccountingDate(payment.receiptDate)
                      : '-'}
                  </td>
                  <td className="px-4 py-3">{payment.activity.name}</td>
                  <td className="px-4 py-3">
                    {formatPersonName(payment.child ?? payment.user)}
                  </td>
                  <td className="px-4 py-3">
                    {formatAmount(payment.activity.price * 100)}
                  </td>
                  <td className="px-4 py-3">{payment.receipt ?? '-'}</td>
                  <td className="px-4 py-3">
                    {payment.receipt ? (
                      <span className="text-xs text-success">Registrado</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </Box>
      </div>
    </Container>
  );
}
