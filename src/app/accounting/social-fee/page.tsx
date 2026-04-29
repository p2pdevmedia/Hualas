import { BillableConceptCode } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAccountingRole } from '@/lib/accounting';
import SocialFeeSettingsForm from './social-fee-settings-form';

type SearchParams = {
  month?: string;
  year?: string;
};

type PersonRecord = {
  key: string;
  type: 'Titular' | 'Hijo/a';
  name: string;
  email?: string | null;
  status: 'PAID' | 'PENDING';
  amount: number;
  paymentId?: string | null;
  paidAt?: Date | null;
  payerLabel?: string;
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

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
  const session = await getServerSession(authOptions);
  if (!isAccountingRole(session?.user?.role)) {
    redirect('/');
  }

  const now = new Date();
  const defaultMonth = now.getUTCMonth() + 1;
  const defaultYear = now.getUTCFullYear();
  const month = parsePeriod(searchParams.month, defaultMonth, 1, 12);
  const year = parsePeriod(searchParams.year, defaultYear, 2020, 2100);

  const [concept, members, payments] = await Promise.all([
    prisma.billableConcept.findUnique({
      where: { code: BillableConceptCode.SOCIAL_FEE },
      select: { defaultAmount: true, name: true, active: true },
    }),
    prisma.user.findMany({
      where: {
        role: 'MEMBER',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        children: {
          select: {
            id: true,
            name: true,
            lastName: true,
          },
          orderBy: [{ lastName: 'asc' }, { name: 'asc' }],
        },
      },
      orderBy: [{ lastName: 'asc' }, { name: 'asc' }],
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

  const socialFeeAmount = concept?.defaultAmount ?? 0;
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
      email: member.email,
      status: memberPayment ? 'PAID' : 'PENDING',
      amount: memberPayment?.amount ?? socialFeeAmount,
      paymentId: memberPayment?.mercadoPagoPaymentId,
      paidAt: memberPayment?.createdAt ?? null,
      payerLabel: memberPayment ? 'Titular' : undefined,
    });

    for (const child of member.children) {
      const childKey = `child:${member.id}:${child.id}`;
      const childPayment = paymentByKey.get(childKey);

      people.push({
        key: childKey,
        type: 'Hijo/a',
        name: formatPersonName(child),
        status: childPayment ? 'PAID' : 'PENDING',
        amount: childPayment?.amount ?? socialFeeAmount,
        paymentId: childPayment?.mercadoPagoPaymentId,
        paidAt: childPayment?.createdAt ?? null,
        payerLabel: memberName,
      });
    }
  }

  const paidPeople = people.filter((person) => person.status === 'PAID');
  const pendingPeople = people.filter((person) => person.status === 'PENDING');
  const collectedAmount = paidPeople.reduce(
    (sum, person) => sum + person.amount,
    0
  );
  const expectedAmount = people.length * socialFeeAmount;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Cuota configurada',
            value: formatMoney(socialFeeAmount),
            helper: 'Monto actual para nuevos cobros',
          },
          {
            label: 'Obligados del período',
            value: people.length.toString(),
            helper: `${formatPeriodLabel(month, year)}`,
          },
          {
            label: 'Pagos registrados',
            value: paidPeople.length.toString(),
            helper: formatMoney(collectedAmount),
          },
          {
            label: 'Pendientes',
            value: pendingPeople.length.toString(),
            helper: formatMoney(expectedAmount - collectedAmount),
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

            <form className="flex flex-wrap gap-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Mes</span>
                <input
                  type="number"
                  name="month"
                  min={1}
                  max={12}
                  defaultValue={month}
                  className="w-24 rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Año</span>
                <input
                  type="number"
                  name="year"
                  min={2020}
                  max={2100}
                  defaultValue={year}
                  className="w-28 rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <button
                type="submit"
                className="self-end rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Ver período
              </button>
            </form>
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
                    {paidPeople.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-muted-foreground"
                        >
                          No hay pagos registrados para este período.
                        </td>
                      </tr>
                    ) : (
                      paidPeople.map((person) => (
                        <tr key={person.key} className="align-top">
                          <td className="px-4 py-3">
                            <div className="font-medium">{person.name}</div>
                            {person.email ? (
                              <div className="text-xs text-muted-foreground">
                                {person.email}
                              </div>
                            ) : null}
                            {person.type === 'Hijo/a' && person.payerLabel ? (
                              <div className="text-xs text-muted-foreground">
                                Responsable: {person.payerLabel}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">{person.type}</td>
                          <td className="px-4 py-3 font-medium">
                            {formatMoney(person.amount)}
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
                    {pendingPeople.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-10 text-center text-muted-foreground"
                        >
                          No hay saldos pendientes para este período.
                        </td>
                      </tr>
                    ) : (
                      pendingPeople.map((person) => (
                        <tr key={person.key} className="align-top">
                          <td className="px-4 py-3">
                            <div className="font-medium">{person.name}</div>
                            {person.email ? (
                              <div className="text-xs text-muted-foreground">
                                {person.email}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">{person.type}</td>
                          <td className="px-4 py-3 font-medium">
                            {formatMoney(socialFeeAmount)}
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
