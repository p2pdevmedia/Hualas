import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { BillableConceptCode } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  formatAccountingDate,
  formatAmount,
  formatPersonName,
} from '@/lib/accounting';
import { Button } from '@/components/ui/button';
import PersonLink from '@/components/accounting/person-link';

const CHARGES_PAGE_SIZE = 20;
const PAYMENTS_PAGE_SIZE = 12;

function formatPeriodLabel(month: number, year: number) {
  return new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function statusLabel(status: string) {
  switch (status) {
    case 'PAID':
      return 'Pagado';
    case 'PARTIALLY_PAID':
      return 'Parcial';
    case 'PENDING_PAYMENT':
    case 'PENDING':
      return 'Pendiente';
    case 'DRAFT':
      return 'Borrador';
    case 'CANCELLED':
      return 'Cancelado';
    case 'EXPIRED':
      return 'Vencido';
    default:
      return status;
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'PAID':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'PARTIALLY_PAID':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'PENDING_PAYMENT':
    case 'PENDING':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-muted bg-muted/40 text-foreground';
  }
}

type SearchParams = {
  chargesPage?: string;
  paymentsPage?: string;
};

function parsePage(value: string | undefined) {
  const parsed = Number(value ?? '1');
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function DebtByFamilyPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await getServerSession(authOptions);
  const chargesPage = parsePage(searchParams.chargesPage);
  const paymentsPage = parsePage(searchParams.paymentsPage);
  const chargesOffset = (chargesPage - 1) * CHARGES_PAGE_SIZE;
  const paymentsOffset = (paymentsPage - 1) * PAYMENTS_PAGE_SIZE;

  const [
    chargesTotal,
    paymentsTotal,
    charges,
    orders,
    payments,
    families,
    concept,
  ] = await Promise.all([
    prisma.orderItem.count({
      where: {
        billableConcept: {
          code: BillableConceptCode.SOCIAL_FEE,
        },
      },
    }),
    prisma.payment.count({
      where: {
        order: {
          items: {
            some: {
              billableConcept: {
                code: BillableConceptCode.SOCIAL_FEE,
              },
            },
          },
        },
      },
    }),
    prisma.orderItem.findMany({
      where: {
        billableConcept: {
          code: BillableConceptCode.SOCIAL_FEE,
        },
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        order: {
          select: {
            id: true,
            status: true,
            responsibleUserId: true,
            responsibleName: true,
            responsibleEmail: true,
            periodMonth: true,
            periodYear: true,
            total: true,
            paidAt: true,
            createdAt: true,
            payments: {
              select: {
                id: true,
                status: true,
                amount: true,
                paidAt: true,
                provider: true,
                providerPaymentId: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
      orderBy: [
        { periodYear: 'desc' },
        { periodMonth: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: chargesOffset,
      take: CHARGES_PAGE_SIZE,
    }),
    prisma.order.findMany({
      where: {
        items: {
          some: {
            billableConcept: {
              code: BillableConceptCode.SOCIAL_FEE,
            },
          },
        },
      },
      include: {
        familyGroup: {
          include: {
            members: {
              include: {
                member: {
                  select: {
                    id: true,
                    name: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
              orderBy: [{ isPaymentResponsible: 'desc' }, { createdAt: 'asc' }],
            },
            responsibleUser: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        items: {
          include: {
            billableConcept: {
              select: {
                code: true,
                name: true,
              },
            },
            member: {
              select: {
                id: true,
                name: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: [
        { periodYear: 'desc' },
        { periodMonth: 'desc' },
        { createdAt: 'desc' },
      ],
    }),
    prisma.payment.findMany({
      where: {
        order: {
          items: {
            some: {
              billableConcept: {
                code: BillableConceptCode.SOCIAL_FEE,
              },
            },
          },
        },
      },
      include: {
        order: {
          select: {
            id: true,
            familyGroupId: true,
            responsibleUserId: true,
            responsibleName: true,
            periodMonth: true,
            periodYear: true,
            status: true,
            total: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: paymentsOffset,
      take: PAYMENTS_PAGE_SIZE,
    }),
    prisma.familyGroup.findMany({
      include: {
        responsibleUser: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        members: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: [{ isPaymentResponsible: 'desc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.billableConcept.findUnique({
      where: { code: BillableConceptCode.SOCIAL_FEE },
      select: { defaultAmount: true },
    }),
  ]);

  const baseAmount = concept?.defaultAmount ?? 0;
  const orderById = new Map(orders.map((order) => [order.id, order]));

  const familyRows = families.map((family) => {
    const familyOrders = orders.filter(
      (order) =>
        order.familyGroupId === family.id ||
        (!order.familyGroupId &&
          order.responsibleUserId === family.responsibleUserId)
    );
    const familyPayments = payments.filter(
      (payment) =>
        payment.order.familyGroupId === family.id ||
        (!payment.order.familyGroupId &&
          payment.order.responsibleUserId === family.responsibleUserId)
    );

    const monthlyRows = familyOrders.flatMap((order) =>
      order.items
        .filter(
          (item) => item.billableConcept.code === BillableConceptCode.SOCIAL_FEE
        )
        .map((item) => ({
          order,
          item,
        }))
    );

    const outstandingRows = monthlyRows.filter(
      ({ order }) => order.status !== 'PAID'
    );

    const totalDebt = outstandingRows.reduce(
      (sum, row) => sum + row.item.total,
      0
    );
    const partialCount = monthlyRows.filter(
      ({ order }) => order.status === 'PARTIALLY_PAID'
    ).length;

    const responsible =
      family.responsibleUser ??
      family.members.find((member) => member.isPaymentResponsible)?.member ??
      null;

    return {
      family,
      responsible,
      familyOrders,
      familyPayments,
      monthlyRows,
      outstandingRows,
      totalDebt,
      partialCount,
    };
  });

  const sortedFamilies = familyRows.sort((left, right) => {
    if (right.totalDebt !== left.totalDebt)
      return right.totalDebt - left.totalDebt;
    return left.family.name.localeCompare(right.family.name, 'es-AR');
  });

  const totalDebt = sortedFamilies.reduce((sum, row) => sum + row.totalDebt, 0);
  const partiallyPaidOrders = orders.filter(
    (order) => order.status === 'PARTIALLY_PAID'
  );
  const paidOrders = orders.filter((order) => order.status === 'PAID');
  const chargesTotalPages = Math.max(
    1,
    Math.ceil(chargesTotal / CHARGES_PAGE_SIZE)
  );
  const paymentsTotalPages = Math.max(
    1,
    Math.ceil(paymentsTotal / PAYMENTS_PAGE_SIZE)
  );

  function pageHref(nextChargesPage: number, nextPaymentsPage: number) {
    const params = new URLSearchParams();
    if (nextChargesPage > 1) {
      params.set('chargesPage', String(nextChargesPage));
    }
    if (nextPaymentsPage > 1) {
      params.set('paymentsPage', String(nextPaymentsPage));
    }
    const qs = params.toString();
    return qs
      ? `/accounting/debt-by-family?${qs}`
      : '/accounting/debt-by-family';
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Familias registradas',
            value: sortedFamilies.length.toString(),
            helper: 'Con grupo familiar creado',
          },
          {
            label: 'Deuda total',
            value: formatAmount(totalDebt),
            helper: `${familyRows.filter((row) => row.totalDebt > 0).length} familias con saldo`,
          },
          {
            label: 'Órdenes parciales',
            value: partiallyPaidOrders.length.toString(),
            helper: 'Pagos iniciados pero no cerrados',
          },
          {
            label: 'Órdenes pagadas',
            value: paidOrders.length.toString(),
            helper: `Cuota social base ${formatAmount(baseAmount)}`,
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

      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            Estado de deuda por socio/familia
          </h2>
          <p className="text-sm text-muted-foreground">
            Vista consolidada para contaduría: quién debe, qué mes debe, cuánto
            debe, qué quedó parcial, historial de pagos y saldo por responsable.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-muted/20 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Responsable</th>
                <th className="px-4 py-3 font-medium">Familia</th>
                <th className="px-4 py-3 font-medium">Deuda total</th>
                <th className="px-4 py-3 font-medium">Meses adeudados</th>
                <th className="px-4 py-3 font-medium">Parciales</th>
                <th className="px-4 py-3 font-medium">Último pago</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedFamilies.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No hay familias registradas.
                  </td>
                </tr>
              ) : (
                sortedFamilies.map(
                  ({
                    family,
                    responsible,
                    outstandingRows,
                    totalDebt,
                    partialCount,
                    familyPayments,
                  }) => {
                    const responsibleHref = responsible
                      ? `/admin/users/${responsible.id}/view`
                      : null;
                    const overduePeriods = new Map<string, number>();
                    for (const row of outstandingRows) {
                      const key = `${row.item.periodMonth}/${row.item.periodYear}`;
                      overduePeriods.set(
                        key,
                        (overduePeriods.get(key) ?? 0) + row.item.total
                      );
                    }

                    const lastPayment = familyPayments[0] ?? null;

                    return (
                      <tr key={family.id} className="align-top">
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {responsibleHref ? (
                              <PersonLink
                                href={responsibleHref}
                                className="text-link hover:underline"
                              >
                                {formatPersonName(responsible)}
                              </PersonLink>
                            ) : (
                              formatPersonName(responsible)
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {family.responsibleEmail}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{family.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {family.members.length} integrante
                            {family.members.length === 1 ? '' : 's'}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatAmount(totalDebt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {Array.from(overduePeriods.entries()).length ===
                            0 ? (
                              <span className="text-muted-foreground">
                                Sin deuda
                              </span>
                            ) : (
                              Array.from(overduePeriods.entries()).map(
                                ([period, amount]) => (
                                  <div key={period} className="text-xs">
                                    <span className="font-medium">
                                      {period}
                                    </span>{' '}
                                    <span className="text-muted-foreground">
                                      {formatAmount(amount)}
                                    </span>
                                  </div>
                                )
                              )
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full border px-2 py-1 text-xs font-medium">
                            {partialCount}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {lastPayment ? (
                            <div className="space-y-1">
                              <div className="font-medium">
                                {formatAmount(lastPayment.amount)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatAccountingDate(lastPayment.createdAt)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              Sin pagos
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="text-lg font-semibold tracking-tight">
            Detalle de meses
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Quién debe cada período, cuánto debe y si quedó parcialmente pago.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-muted/20 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Persona</th>
                  <th className="px-4 py-3 font-medium">Período</th>
                  <th className="px-4 py-3 font-medium">Monto</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Pago</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {charges.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No hay cargos de cuota social cargados.
                    </td>
                  </tr>
                ) : (
                  charges.map((charge) => {
                    const member = charge.member;
                    const payment =
                      charge.order.payments.find(
                        (entry) => entry.status === 'APPROVED'
                      ) ??
                      charge.order.payments[0] ??
                      null;
                    return (
                      <tr key={charge.id} className="align-top">
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {member ? (
                              <PersonLink
                                href={`/admin/users/${member.id}/view`}
                                className="text-link hover:underline"
                              >
                                {formatPersonName(member)}
                              </PersonLink>
                            ) : (
                              'Sin titular'
                            )}
                          </div>
                          {member?.email ? (
                            <div className="text-xs text-muted-foreground">
                              {member.email}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {formatPeriodLabel(
                            charge.periodMonth,
                            charge.periodYear
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatAmount(charge.total)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${statusClass(
                              charge.order.status
                            )}`}
                          >
                            {statusLabel(charge.order.status)}
                          </span>
                          {charge.order.status === 'PARTIALLY_PAID' ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Orden parcial: {formatAmount(charge.order.total)}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {payment ? (
                            <div className="space-y-1">
                              <div className="font-medium">
                                {formatAmount(payment.amount)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatAccountingDate(payment.createdAt)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {payment.provider}
                                {payment.providerPaymentId
                                  ? ` · ${payment.providerPaymentId}`
                                  : ''}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              Sin pago
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Página {chargesPage} de {chargesTotalPages} · {chargesTotal}{' '}
              registros
            </span>
            <div className="flex gap-2">
              {chargesPage <= 1 ? (
                <Button type="button" variant="outline" disabled>
                  Anterior
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link
                    href={pageHref(chargesPage - 1, paymentsPage)}
                    prefetch={true}
                  >
                    Anterior
                  </Link>
                </Button>
              )}
              {chargesPage >= chargesTotalPages ? (
                <Button type="button" variant="outline" disabled>
                  Siguiente
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link
                    href={pageHref(chargesPage + 1, paymentsPage)}
                    prefetch={true}
                  >
                    Siguiente
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </article>

        <article className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="text-lg font-semibold tracking-tight">
            Historial de pagos
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Últimos movimientos de pago vinculados a cuota social y orden
            familiar.
          </p>
          <div className="mt-4 space-y-3">
            {payments.length === 0 ? (
              <div className="rounded-xl border p-6 text-sm text-muted-foreground">
                No hay pagos registrados.
              </div>
            ) : (
              payments.map((payment) => {
                const order = orderById.get(payment.orderId) ?? null;
                return (
                  <article
                    key={payment.id}
                    className="rounded-xl border p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {order?.responsibleName ?? 'Sin responsable'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order
                            ? `${formatPeriodLabel(order.periodMonth, order.periodYear)} · ${statusLabel(order.status)}`
                            : 'Sin período'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatAmount(payment.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatAccountingDate(payment.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border px-2 py-1">
                        {payment.provider}
                      </span>
                      {payment.providerPaymentId ? (
                        <span className="rounded-full border px-2 py-1">
                          {payment.providerPaymentId}
                        </span>
                      ) : null}
                      {payment.status ? (
                        <span className="rounded-full border px-2 py-1">
                          {payment.status}
                        </span>
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Página {paymentsPage} de {paymentsTotalPages} · {paymentsTotal}{' '}
              registros
            </span>
            <div className="flex gap-2">
              {paymentsPage <= 1 ? (
                <Button type="button" variant="outline" disabled>
                  Anterior
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link
                    href={pageHref(chargesPage, paymentsPage - 1)}
                    prefetch={true}
                  >
                    Anterior
                  </Link>
                </Button>
              )}
              {paymentsPage >= paymentsTotalPages ? (
                <Button type="button" variant="outline" disabled>
                  Siguiente
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link
                    href={pageHref(chargesPage, paymentsPage + 1)}
                    prefetch={true}
                  >
                    Siguiente
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <h3 className="text-lg font-semibold tracking-tight">
          Criterio de lectura
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            La deuda total se calcula con ítems de orden de cuota social
            pendientes de pago.
          </li>
          <li>
            El estado parcial se toma desde la orden familiar cuando quedó
            `PARTIALLY_PAID`.
          </li>
          <li>
            El historial muestra los últimos pagos asociados a cada
            responsable/familia.
          </li>
        </ul>
      </section>

      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href="/accounting/social-fee" prefetch={true}>
            Volver a cuota social
          </Link>
        </Button>
      </div>
    </div>
  );
}
