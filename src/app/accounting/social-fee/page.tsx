import { BillableConceptCode, MovementType } from '@prisma/client';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  formatAmount,
  getAccountingChildProfileHref,
  getAccountingUserProfileHref,
  isAccountingRole,
} from '@/lib/accounting';
import { normalizeSocialFeeAmount } from '@/lib/social-fee';
import PersonLink from '@/components/accounting/person-link';
import { Button } from '@/components/ui/button';
import { matchesAccountingSearch } from '@/lib/accounting-search';
import SocialFeeSettingsForm from './social-fee-settings-form';
import SocialFeePeriodFilter from './social-fee-period-filter';

const PAGE_SIZE = 20;

type SearchParams = {
  month?: string;
  year?: string;
  q?: string;
  page?: string;
  paidPage?: string;
  pendingPage?: string;
};

type PersonRecord = {
  key: string;
  type: 'Titular' | 'Hijo/a';
  name: string;
  href: string;
  email?: string | null;
  status: 'PAID' | 'PENDING';
  amount: number;
  paymentId?: string | null;
  paidAt?: Date | null;
  createdAt: Date;
  payerLabel?: string;
  payerHref?: string;
};

function formatPeriodLabel(month: number, year: number) {
  return new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function parsePeriod(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number
) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return fallback;
  }

  return parsed;
}

function formatPersonName(
  person: { name?: string | null; lastName?: string | null } | null | undefined
) {
  if (!person) {
    return 'Sin nombre';
  }

  return `${person.name ?? ''} ${person.lastName ?? ''}`.trim() || 'Sin nombre';
}

export default async function SocialFeePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Auth gating happens in the parent /accounting layout.
  await getServerSession(authOptions);

  const now = new Date();
  const defaultMonth = now.getUTCMonth() + 1;
  const defaultYear = now.getUTCFullYear();
  const month = parsePeriod(searchParams.month, defaultMonth, 1, 12);
  const year = parsePeriod(searchParams.year, defaultYear, 2020, 2100);
  const rawQ = searchParams.q?.trim() ?? '';
  const q = rawQ.toLowerCase();
  const legacyPage = Math.max(Number(searchParams.page ?? '1') || 1, 1);
  const paidPage = Math.max(
    Number(searchParams.paidPage ?? legacyPage) || 1,
    1
  );
  const pendingPage = Math.max(
    Number(searchParams.pendingPage ?? legacyPage) || 1,
    1
  );

  const periodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const [
    concept,
    members,
    payments,
    socialFeeExpenseMovements,
    previousMonthCloses,
  ] = await Promise.all([
    prisma.billableConcept.findUnique({
      where: { code: BillableConceptCode.SOCIAL_FEE },
      select: { defaultAmount: true, name: true, active: true },
    }),
    prisma.user.findMany({
      where: {
        // Every user is implicitly a socio (MEMBER); list all active users.
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        createdAt: true,
        children: {
          select: {
            id: true,
            name: true,
            lastName: true,
            createdAt: true,
          },
          orderBy: [{ lastName: 'asc' }, { name: 'asc' }],
        },
      },
      orderBy: [{ lastName: 'asc' }, { name: 'asc' }],
    }),

    prisma.accountingMovement.findMany({
      where: {
        type: MovementType.EXPENSE,
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
        OR: [
          {
            category: {
              contains: 'cuota social',
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: 'cuota social',
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        amount: true,
      },
    }),
    prisma.accountingMonthClose.findMany({
      where: {
        OR: [
          { periodYear: { lt: year } },
          {
            periodYear: year,
            periodMonth: { lt: month },
          },
        ],
      },
      orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
      select: {
        periodMonth: true,
        periodYear: true,
        positiveBalance: true,
      },
    }),
    prisma.socialFeePayment.findMany({
      where: {
        periodMonth: month,
        periodYear: year,
      },
      include: {
        user: {
          select: {
            name: true,
            lastName: true,
            email: true,
          },
        },
        child: {
          select: {
            name: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const socialFeeAmount = normalizeSocialFeeAmount(concept?.defaultAmount ?? 0);
  const paymentByKey = new Map<string, (typeof payments)[number]>();
  for (const payment of payments) {
    const key = payment.childId
      ? `child:${payment.userId}:${payment.childId}`
      : `user:${payment.userId}`;
    paymentByKey.set(key, payment);
  }

  const people: PersonRecord[] = [];

  for (const member of members) {
    const memberName = formatPersonName(member);
    const memberKey = `user:${member.id}`;
    const memberPayment = paymentByKey.get(memberKey);

    people.push({
      key: memberKey,
      type: 'Titular',
      name: memberName,
      href: getAccountingUserProfileHref(member.id),
      email: member.email,
      status: memberPayment ? 'PAID' : 'PENDING',
      amount: memberPayment?.amount ?? socialFeeAmount,
      paymentId: memberPayment?.mercadoPagoPaymentId,
      paidAt: memberPayment?.createdAt ?? null,
      createdAt: memberPayment?.createdAt ?? member.createdAt,
      payerLabel: memberPayment ? 'Titular' : undefined,
      payerHref: memberPayment
        ? getAccountingUserProfileHref(member.id)
        : undefined,
    });

    for (const child of member.children) {
      const childKey = `child:${member.id}:${child.id}`;
      const childPayment = paymentByKey.get(childKey);

      people.push({
        key: childKey,
        type: 'Hijo/a',
        name: formatPersonName(child),
        href: getAccountingChildProfileHref(member.id, child.id),
        status: childPayment ? 'PAID' : 'PENDING',
        amount: childPayment?.amount ?? socialFeeAmount,
        paymentId: childPayment?.mercadoPagoPaymentId,
        paidAt: childPayment?.createdAt ?? null,
        createdAt: childPayment?.createdAt ?? child.createdAt,
        payerLabel: memberName,
        payerHref: getAccountingUserProfileHref(member.id),
      });
    }
  }

  // Keep the newest records at the top so newly added children do not get buried
  // behind older alphabetical entries.
  const orderedPeople = [...people].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === 'PAID' ? -1 : 1;
    }

    const leftDate = left.paidAt ?? left.createdAt;
    const rightDate = right.paidAt ?? right.createdAt;

    if (leftDate.getTime() !== rightDate.getTime()) {
      return rightDate.getTime() - leftDate.getTime();
    }

    return left.name.localeCompare(right.name, 'es-AR');
  });

  const filteredPeople = q
    ? orderedPeople.filter((person) => {
        return matchesAccountingSearch(q, [
          person.name,
          person.email ?? '',
          person.payerLabel ?? '',
        ]);
      })
    : orderedPeople;
  const totalPeople = filteredPeople.length;
  const paidPeople = filteredPeople.filter(
    (person) => person.status === 'PAID'
  );
  const pendingPeople = filteredPeople.filter(
    (person) => person.status === 'PENDING'
  );
  const paidTotalPages = Math.max(Math.ceil(paidPeople.length / PAGE_SIZE), 1);
  const pendingTotalPages = Math.max(
    Math.ceil(pendingPeople.length / PAGE_SIZE),
    1
  );
  const currentPaidPage = Math.min(paidPage, paidTotalPages);
  const currentPendingPage = Math.min(pendingPage, pendingTotalPages);
  const paidPageStart =
    paidPeople.length === 0 ? 0 : (currentPaidPage - 1) * PAGE_SIZE;
  const paidPageEnd = Math.min(paidPageStart + PAGE_SIZE, paidPeople.length);
  const pendingPageStart =
    pendingPeople.length === 0 ? 0 : (currentPendingPage - 1) * PAGE_SIZE;
  const pendingPageEnd = Math.min(
    pendingPageStart + PAGE_SIZE,
    pendingPeople.length
  );
  const pagePaidPeople = paidPeople.slice(paidPageStart, paidPageEnd);
  const pagePendingPeople = pendingPeople.slice(
    pendingPageStart,
    pendingPageEnd
  );
  const collectedAmount = paidPeople.reduce(
    (sum, person) => sum + person.amount,
    0
  );
  const socialFeeExpenseAmount = socialFeeExpenseMovements.reduce(
    (sum, movement) => sum + movement.amount,
    0
  );
  const previousSocialFeeCash = previousMonthCloses.reduce(
    (sum, close) => sum + Math.max(close.positiveBalance, 0),
    0
  );
  const socialFeeCashAmount =
    collectedAmount - socialFeeExpenseAmount + previousSocialFeeCash;
  const expectedAmount = people.length * socialFeeAmount;
  const visiblePaidRangeLabel =
    paidPeople.length === 0
      ? 'Sin resultados'
      : `Mostrando ${paidPageStart + 1}-${paidPageEnd} de ${paidPeople.length}`;
  const visiblePendingRangeLabel =
    pendingPeople.length === 0
      ? 'Sin resultados'
      : `Mostrando ${pendingPageStart + 1}-${pendingPageEnd} de ${pendingPeople.length}`;

  function pageHref(nextPaidPage: number, nextPendingPage: number) {
    const params = new URLSearchParams({
      month: String(month),
      year: String(year),
      paidPage: String(nextPaidPage),
      pendingPage: String(nextPendingPage),
    });

    if (rawQ) {
      params.set('q', rawQ);
    }

    return `/accounting/social-fee?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: 'Caja',
            value: formatAmount(socialFeeCashAmount),
            helper: `${formatAmount(collectedAmount)} - ${formatAmount(
              socialFeeExpenseAmount
            )} + ${formatAmount(previousSocialFeeCash)}`,
          },
          {
            label: 'Pagos registrados',
            value: paidPeople.length.toString(),
            helper: formatAmount(collectedAmount),
          },
          {
            label: 'Cuota configurada',
            value: formatAmount(socialFeeAmount),
            helper: 'Monto actual para nuevos cobros',
          },
          {
            label: 'Obligados del período',
            value: people.length.toString(),
            helper: `${formatPeriodLabel(month, year)}`,
          },
          {
            label: 'Pendientes',
            value: pendingPeople.length.toString(),
            helper: formatAmount(expectedAmount - collectedAmount),
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

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border bg-card p-5 shadow-sm space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">
                Cuota social
              </h2>
              <p className="text-sm text-muted-foreground">
                Estado de pagos y deudas para {formatPeriodLabel(month, year)}.
              </p>
            </div>

            <div className="space-y-2">
              <SocialFeePeriodFilter initialMonth={month} initialYear={year} />
              <form>
                <input type="hidden" name="month" value={String(month)} />
                <input type="hidden" name="year" value={String(year)} />
                <input type="hidden" name="paidPage" value="1" />
                <input type="hidden" name="pendingPage" value="1" />
                <input
                  type="text"
                  name="q"
                  defaultValue={searchParams.q ?? ''}
                  placeholder="Nombre, apellido, actividad o mail"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Pagos registrados
              </h3>
              <div className="overflow-x-auto rounded-xl border">
                <table className="min-w-full text-sm">
                  <thead className="border-b bg-muted/20 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Persona</th>
                      <th className="px-4 py-3 font-medium">Tipo</th>
                      <th className="px-4 py-3 font-medium">Monto</th>
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium">MP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pagePaidPeople.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-muted-foreground"
                        >
                          No hay pagos registrados para este período.
                        </td>
                      </tr>
                    ) : (
                      pagePaidPeople.map((person) => (
                        <tr key={person.key} className="align-top">
                          <td className="px-4 py-3">
                            <div className="font-medium">
                              <PersonLink
                                href={person.href}
                                className="text-link hover:underline"
                              >
                                {person.name}
                              </PersonLink>
                            </div>
                            {person.email ? (
                              <div className="text-xs text-muted-foreground">
                                {person.email}
                              </div>
                            ) : null}
                            {person.type === 'Hijo/a' && person.payerLabel ? (
                              <div className="text-xs text-muted-foreground">
                                Responsable:{' '}
                                <PersonLink
                                  href={person.payerHref}
                                  className="text-link hover:underline"
                                >
                                  {person.payerLabel}
                                </PersonLink>
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">{person.type}</td>
                          <td className="px-4 py-3 font-medium">
                            {formatAmount(person.amount)}
                          </td>
                          <td className="px-4 py-3">
                            {person.paidAt
                              ? person.paidAt.toLocaleDateString('es-AR')
                              : '-'}
                          </td>
                          <td className="px-4 py-3">
                            {person.paymentId ?? '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Página {currentPaidPage} de {paidTotalPages} ·{' '}
                  {visiblePaidRangeLabel}
                </span>
                <div className="flex gap-2">
                  {currentPaidPage <= 1 ? (
                    <Button type="button" variant="outline" disabled>
                      Anterior
                    </Button>
                  ) : (
                    <Button asChild variant="outline">
                      <Link
                        href={pageHref(currentPaidPage - 1, currentPendingPage)}
                        prefetch={true}
                      >
                        Anterior
                      </Link>
                    </Button>
                  )}
                  {currentPaidPage >= paidTotalPages ? (
                    <Button type="button" variant="outline" disabled>
                      Siguiente
                    </Button>
                  ) : (
                    <Button asChild variant="outline">
                      <Link
                        href={pageHref(currentPaidPage + 1, currentPendingPage)}
                        prefetch={true}
                      >
                        Siguiente
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Pendientes
              </h3>
              <div className="overflow-x-auto rounded-xl border">
                <table className="min-w-full text-sm">
                  <thead className="border-b bg-muted/20 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Persona</th>
                      <th className="px-4 py-3 font-medium">Tipo</th>
                      <th className="px-4 py-3 font-medium">Monto adeudado</th>
                      <th className="px-4 py-3 font-medium">Responsable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pagePendingPeople.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-10 text-center text-muted-foreground"
                        >
                          No hay saldos pendientes para este período.
                        </td>
                      </tr>
                    ) : (
                      pagePendingPeople.map((person) => (
                        <tr key={person.key} className="align-top">
                          <td className="px-4 py-3">
                            <div className="font-medium">
                              <PersonLink
                                href={person.href}
                                className="text-link hover:underline"
                              >
                                {person.name}
                              </PersonLink>
                            </div>
                            {person.email ? (
                              <div className="text-xs text-muted-foreground">
                                {person.email}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">{person.type}</td>
                          <td className="px-4 py-3 font-medium">
                            {formatAmount(socialFeeAmount)}
                          </td>
                          <td className="px-4 py-3">
                            {person.type === 'Titular'
                              ? 'Titular'
                              : (person.payerLabel ?? 'Sin responsable')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                Página {currentPendingPage} de {pendingTotalPages} ·{' '}
                {visiblePendingRangeLabel}
              </span>
              <div className="flex gap-2">
                {currentPendingPage <= 1 ? (
                  <Button type="button" variant="outline" disabled>
                    Anterior
                  </Button>
                ) : (
                  <Button asChild variant="outline">
                    <Link
                      href={pageHref(currentPaidPage, currentPendingPage - 1)}
                      prefetch={true}
                    >
                      Anterior
                    </Link>
                  </Button>
                )}
                {currentPendingPage >= pendingTotalPages ? (
                  <Button type="button" variant="outline" disabled>
                    Siguiente
                  </Button>
                ) : (
                  <Button asChild variant="outline">
                    <Link
                      href={pageHref(currentPaidPage, currentPendingPage + 1)}
                      prefetch={true}
                    >
                      Siguiente
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </article>

        <aside className="space-y-6">
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">
                Ajuste de monto
              </h2>
              <p className="text-sm text-muted-foreground">
                Actualizá el valor base de la cuota social.
              </p>
            </div>

            <div className="mt-4">
              <SocialFeeSettingsForm initialAmount={socialFeeAmount} />
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight">
              Observaciones
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Los pagos se registran por período mensual.</li>
              <li>Una cuota puede existir para un titular o para un hijo/a.</li>
              <li>El monto actualizado afecta cobros futuros.</li>
            </ul>
          </section>
        </aside>
      </section>
    </div>
  );
}
