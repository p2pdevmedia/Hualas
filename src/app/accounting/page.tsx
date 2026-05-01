import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
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
import { ReceiptText, ArrowRight } from 'lucide-react';
import { buildAccountingMovementReceiptUrl } from '@/lib/blob-urls';

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

  const [
    monthMovements,
    recentMovements,
    monthPayments,
    monthManualPayments,
    pendingManualPayments,
  ] = await Promise.all([
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
    prisma.payment.aggregate({
      where: {
        provider: 'MANUAL_TRANSFER',
        status: 'APPROVED',
        paidAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.payment.count({
      where: {
        provider: 'MANUAL_TRANSFER',
        status: 'PENDING',
      },
    }),
  ]);

  const manualIncome = monthManualPayments._sum.amount ?? 0;
  const totalMp = monthPayments.reduce(
    (sum, payment) => sum + payment.activity.price * 100,
    0
  );
  const totalMovementIncome = monthMovements
    .filter((movement) => movement.type === 'INCOME')
    .reduce((sum, movement) => sum + movement.amount, 0);
  const totalExpense = monthMovements
    .filter((movement) => movement.type === 'EXPENSE')
    .reduce((sum, movement) => sum + movement.amount, 0);
  const totalIncome = totalMovementIncome + manualIncome + totalMp;
  const netBalance = totalIncome - totalExpense;
  const recentPayments = monthPayments.slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Ingresos del mes',
            value: formatAmount(totalIncome),
            helper: 'Incluye movimientos, pagos manuales y MP',
          },
          {
            label: 'Egresos del mes',
            value: formatAmount(totalExpense),
            helper: 'Movimientos manuales registrados',
          },
          {
            label: 'Balance neto',
            value: formatAmount(netBalance),
            helper: 'Ingresos menos egresos',
          },
          {
            label: 'Pagos manuales',
            value: formatAmount(manualIncome),
            helper: 'Transferencias aprobadas del mes',
          },
          {
            label: 'Cobrado por MP',
            value: formatAmount(totalMp),
            helper: 'Pagos aprobados del mes',
          },
          {
            label: 'Manuales pendientes',
            value: String(pendingManualPayments),
            helper: 'Transferencias esperando revisión',
          },
        ].map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border bg-card p-5 shadow-sm"
          >
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{card.helper}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Últimos movimientos
              </h2>
              <p className="text-sm text-muted-foreground">
                Últimos 10 registros manuales.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/accounting/movements">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
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
                            href={buildAccountingMovementReceiptUrl(
                              movement.id
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-link hover:underline"
                          >
                            <ReceiptText className="h-4 w-4" />
                            Ver
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Pagos MP recientes
              </h2>
              <p className="text-sm text-muted-foreground">
                Últimos 5 pagos con comprobante.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/accounting/payments">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="space-y-3">
            {recentPayments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No hay pagos para mostrar.
              </p>
            ) : (
              recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-xl border bg-muted/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {formatPersonName(payment.child ?? payment.user)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {payment.activity.name}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {formatAmount(payment.activity.price * 100)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>
                      {payment.receiptDate
                        ? formatAccountingDate(payment.receiptDate)
                        : 'Sin fecha'}
                    </span>
                    <span>{payment.receipt ? 'Con recibo' : 'Sin recibo'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
