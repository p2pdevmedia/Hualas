import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import {
  formatAccountingDate,
  formatAmount,
  getAccountingManualPaymentAmount,
  getAccountingChildProfileHref,
  getAccountingUserProfileHref,
  formatPersonName,
  getAccountingPaymentDate,
  isAccountingRole,
  movementTypeClass,
  movementTypeLabel,
} from '@/lib/accounting';
import { Button } from '@/components/ui/button';
import { ReceiptText, ArrowRight } from 'lucide-react';
import PersonLink from '@/components/accounting/person-link';
import {
  buildAccountingMovementReceiptUrl,
  buildManualPaymentReceiptUrl,
} from '@/lib/blob-urls';
import { matchesAccountingSearch } from '@/lib/accounting-search';

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

type RecentAccountingEntry = {
  id: string;
  date: Date;
  origin: 'MOVEMENT' | 'MANUAL_PAYMENT' | 'MP_PAYMENT';
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  amount: number;
  receiptLabel: string | null;
  receiptHref: string | null;
  actionLabel: string;
  actionHref: string;
  personHref?: string | null;
};

export default async function AccountingDashboardPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  // Auth gating happens in the parent /accounting layout.
  await getServerSession(authOptions);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    monthMovements,
    recentMovements,
    monthPayments,
    approvedManualPayments,
    verifiedManualPaymentsCount,
    pendingManualPaymentsCount,
    monthProfessorPayments,
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
        user: { select: { id: true, name: true, lastName: true } },
        child: {
          select: { id: true, userId: true, name: true, lastName: true },
        },
      },
    }),
    prisma.payment.findMany({
      where: {
        provider: 'MANUAL_TRANSFER',
        status: 'APPROVED',
      },
      select: {
        id: true,
        amount: true,
        payerName: true,
        order: {
          select: {
            responsibleUserId: true,
            responsibleName: true,
            total: true,
          },
        },
        paidAt: true,
        updatedAt: true,
        createdAt: true,
      },
    }),
    prisma.payment.count({
      where: {
        provider: 'MANUAL_TRANSFER',
        status: 'APPROVED',
      },
    }),
    prisma.payment.count({
      where: {
        provider: 'MANUAL_TRANSFER',
        status: 'PENDING',
      },
    }),
    prisma.professorPayment.findMany({
      where: {
        status: 'PAID',
        paidAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    }),
  ]);

  const manualIncome = approvedManualPayments
    .filter((payment) => {
      const paymentDate = getAccountingPaymentDate(payment);
      return paymentDate
        ? paymentDate >= monthStart && paymentDate <= monthEnd
        : false;
    })
    .reduce(
      (sum, payment) => sum + getAccountingManualPaymentAmount(payment),
      0
    );
  const totalMp = monthPayments.reduce(
    (sum, payment) => sum + payment.activity.price,
    0
  );
  const totalMovementIncome = monthMovements
    .filter((movement) => movement.type === 'INCOME')
    .reduce((sum, movement) => sum + movement.amount, 0);
  const totalMovementExpense = monthMovements
    .filter((movement) => movement.type === 'EXPENSE')
    .reduce((sum, movement) => sum + movement.amount, 0);
  const totalProfessorExpense = monthProfessorPayments.reduce(
    (sum, p) => sum + p.amount,
    0
  );
  const totalExpense = totalMovementExpense + totalProfessorExpense;
  const totalIncome = totalMovementIncome + manualIncome + totalMp;
  const netBalance = totalIncome - totalExpense;
  const recentMovementEntries: RecentAccountingEntry[] = recentMovements.map(
    (movement) => ({
      id: movement.id,
      date: movement.date,
      origin: 'MOVEMENT',
      type: movement.type,
      category: movement.category,
      description: movement.description,
      amount: movement.amount,
      receiptLabel: movement.receiptImage ? 'Ver' : null,
      receiptHref: movement.receiptImage
        ? buildAccountingMovementReceiptUrl(movement.id)
        : null,
      actionLabel: 'Editar',
      actionHref: `/accounting/movements/${movement.id}/edit`,
    })
  );
  const recentManualPaymentEntries = approvedManualPayments.reduce<
    RecentAccountingEntry[]
  >((entries, payment) => {
    const paymentDate = getAccountingPaymentDate(payment);
    if (!paymentDate) return entries;

    entries.push({
      id: payment.id,
      date: paymentDate,
      origin: 'MANUAL_PAYMENT',
      type: 'INCOME',
      category: 'Pagos manuales',
      description:
        payment.payerName ?? payment.order.responsibleName ?? 'Pago manual',
      amount: getAccountingManualPaymentAmount(payment),
      receiptLabel: payment.receiptUrl ? 'Ver' : null,
      receiptHref: payment.receiptUrl
        ? buildManualPaymentReceiptUrl(payment.id)
        : null,
      actionLabel: 'Revisar',
      actionHref: '/accounting/manual-payments?status=PENDING',
      personHref: payment.order.responsibleUserId
        ? getAccountingUserProfileHref(payment.order.responsibleUserId)
        : null,
    });

    return entries;
  }, []);
  const recentMpPaymentEntries: RecentAccountingEntry[] = monthPayments.map(
    (payment) => ({
      id: payment.id,
      date: payment.receiptDate ?? new Date(0),
      origin: 'MP_PAYMENT',
      type: 'INCOME',
      category: 'Mercado Pago',
      description: `${payment.activity.name} · ${formatPersonName(
        payment.child ?? payment.user
      )}`,
      amount: payment.activity.price,
      receiptLabel: payment.receipt ? 'Con recibo' : null,
      receiptHref: null,
      actionLabel: 'Ver',
      actionHref: '/accounting/payments',
      personHref: payment.child
        ? getAccountingChildProfileHref(payment.user.id, payment.child.id)
        : getAccountingUserProfileHref(payment.user.id),
    })
  );
  const searchTerm = searchParams?.q?.trim() ?? '';
  const recentAccountingEntries: RecentAccountingEntry[] = [
    ...recentMovementEntries,
    ...recentManualPaymentEntries,
    ...recentMpPaymentEntries,
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .filter((entry) =>
      searchTerm
        ? matchesAccountingSearch(searchTerm, [
            entry.description,
            entry.category,
          ])
        : true
    )
    .slice(0, 10);
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
            helper: 'Movimientos manuales y honorarios de profesores',
          },
          {
            label: 'Balance neto',
            value: formatAmount(netBalance),
            helper: 'Ingresos menos egresos',
          },
          {
            label: 'Pagos manuales verificados',
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
            value: String(pendingManualPaymentsCount),
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
        <form className="xl:col-span-2 rounded-2xl border bg-card p-4 shadow-sm">
          <input
            type="text"
            name="q"
            defaultValue={searchParams?.q ?? ''}
            placeholder="Buscar por nombre, apellido, actividad o mail"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </form>
        <article
          id="movimientos"
          className="rounded-2xl border bg-card p-5 shadow-sm xl:col-span-2"
        >
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Movimientos
              </h2>
              <p className="text-sm text-muted-foreground">
                Movimientos manuales, pagos manuales aprobados y pagos MP en una
                sola vista.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/accounting/movements/new" prefetch={true}>
                  Nuevo movimiento
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link
                  href="/accounting/manual-payments?status=PENDING"
                  prefetch={true}
                >
                  Revisar pagos manuales
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild>
                <Link href="/accounting/movements" prefetch={true}>
                  Ver movimientos
                </Link>
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Fecha</th>
                  <th className="py-2 pr-4 font-medium">Origen</th>
                  <th className="py-2 pr-4 font-medium">Tipo</th>
                  <th className="py-2 pr-4 font-medium">Categoría</th>
                  <th className="py-2 pr-4 font-medium">Descripción</th>
                  <th className="py-2 pr-4 font-medium">Monto</th>
                  <th className="py-2 pr-4 font-medium">Recibo</th>
                  <th className="py-2 pr-4 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentAccountingEntries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No hay movimientos cargados.
                    </td>
                  </tr>
                ) : (
                  recentAccountingEntries.map((entry) => (
                    <tr key={`${entry.origin}:${entry.id}`}>
                      <td className="py-3 pr-4">
                        {formatAccountingDate(entry.date)}
                      </td>
                      <td className="py-3 pr-4">
                        {entry.origin === 'MOVEMENT'
                          ? 'Movimiento manual'
                          : entry.origin === 'MANUAL_PAYMENT'
                            ? 'Pago manual'
                            : 'Mercado Pago'}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${movementTypeClass(entry.type)}`}
                        >
                          {movementTypeLabel(entry.type)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{entry.category}</td>
                      <td className="py-3 pr-4">
                        <PersonLink
                          href={entry.personHref}
                          className="text-link hover:underline"
                        >
                          {entry.description}
                        </PersonLink>
                      </td>
                      <td className="py-3 pr-4 font-medium">
                        {formatAmount(entry.amount)}
                      </td>
                      <td className="py-3 pr-4">
                        {entry.receiptHref ? (
                          <a
                            href={entry.receiptHref}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-link hover:underline"
                          >
                            <ReceiptText className="h-4 w-4" />
                            {entry.receiptLabel ?? 'Ver'}
                          </a>
                        ) : entry.receiptLabel ? (
                          <span className="text-muted-foreground">
                            {entry.receiptLabel}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Button asChild variant="outline" className="px-3 py-2">
                          <Link href={entry.actionHref} prefetch={true}>
                            {entry.actionLabel}
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}
