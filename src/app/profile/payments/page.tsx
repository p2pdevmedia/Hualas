import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getManualPaymentRawData } from '@/lib/manual-payments';
import { formatManualPaymentStatus } from '@/lib/manual-payment-ui';
import {
  formatAmount,
  formatCurrencyFromCents,
  formatPersonName,
} from '@/lib/accounting';
import {
  buildPaymentDetailLines,
  collectPaymentDetailChildIds,
} from '@/lib/profile-payment-details';
import { hasProfessorCapability } from '@/lib/roles';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export default async function ProfilePaymentsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const isProfessor = hasProfessorCapability(session);

  const [payments, manualPayments, professorProfile] = await Promise.all([
    prisma.activityParticipant.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { child: { userId: session.user.id } },
        ],
        receipt: { not: null },
      },
      orderBy: { receiptDate: 'desc' },
      include: {
        activity: { select: { name: true, price: true } },
        user: { select: { name: true, lastName: true } },
        child: { select: { name: true, lastName: true } },
      },
    }),
    prisma.payment.findMany({
      where: {
        provider: 'MANUAL_TRANSFER',
        order: {
          responsibleUserId: session.user.id,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            responsibleName: true,
            items: {
              select: {
                description: true,
                quantity: true,
                unitPrice: true,
                total: true,
                periodMonth: true,
                periodYear: true,
                billableConcept: {
                  select: {
                    code: true,
                  },
                },
                activity: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    isProfessor
      ? prisma.professorProfile.findUnique({
          where: { userId: session.user.id },
          include: {
            payments: {
              orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const manualPaymentRawDataById = new Map(
    manualPayments.map((payment) => [
      payment.id,
      getManualPaymentRawData(payment.rawData),
    ])
  );
  const childIds = Array.from(
    new Set(
      Array.from(manualPaymentRawDataById.values()).flatMap(
        collectPaymentDetailChildIds
      )
    )
  );
  const childNameById = new Map<string, string>();

  if (childIds.length > 0) {
    const children = await prisma.child.findMany({
      where: { id: { in: childIds } },
      select: { id: true, name: true, lastName: true },
    });

    for (const child of children) {
      childNameById.set(child.id, formatPersonName(child));
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Historial de pagos
        </h1>
        <p className="text-sm text-muted-foreground">
          Revisá tus pagos aprobados de actividades.
        </p>
      </header>

      <section className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">Pagos aprobados</h2>

        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no tenés pagos registrados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Actividad</th>
                  <th className="px-3 py-2 font-medium">Participante</th>
                  <th className="px-3 py-2 font-medium">Comprobante</th>
                  <th className="px-3 py-2 font-medium text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const participant = payment.child ?? payment.user;
                  const participantName = [
                    participant?.name,
                    participant?.lastName,
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="px-3 py-2 text-muted-foreground">
                        {payment.receiptDate
                          ? payment.receiptDate.toLocaleDateString('es-AR')
                          : '-'}
                      </td>
                      <td className="px-3 py-2">{payment.activity.name}</td>
                      <td className="px-3 py-2">
                        {participantName || 'Sin nombre'}
                      </td>
                      <td className="px-3 py-2">{payment.receipt ?? '-'}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatAmount(payment.activity.price)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">Transferencias manuales</h2>
        <p className="text-sm text-muted-foreground">
          Estado de tus comprobantes enviados durante el checkout.
        </p>

        {manualPayments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no tenés transferencias registradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Fecha</th>
                  <th className="px-3 py-2 text-left font-medium">Actividad</th>
                  <th className="px-3 py-2 text-left font-medium">Estado</th>
                  <th className="px-3 py-2 text-left font-medium">
                    Comentario
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Detalle</th>
                  <th className="px-3 py-2 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {manualPayments.map((payment) => {
                  const rawData =
                    manualPaymentRawDataById.get(payment.id) ?? {};
                  const status = formatManualPaymentStatus(payment.status);
                  const activityNames = payment.order.items
                    .filter(
                      (item) => item.billableConcept.code === 'ACTIVITY_FEE'
                    )
                    .map((item) => item.activity?.name ?? item.description)
                    .filter((name): name is string => Boolean(name));
                  const detailLines = buildPaymentDetailLines({
                    orderItems: payment.order.items,
                    rawData,
                    selfName: payment.order.responsibleName || 'Titular',
                    childNameById,
                  });

                  return (
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="px-3 py-2 text-muted-foreground">
                        {(
                          payment.paidAt ??
                          payment.updatedAt ??
                          payment.createdAt
                        ).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-3 py-2">
                        {activityNames.length > 0
                          ? activityNames.join(', ')
                          : 'Sin actividad'}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {rawData.accountantComments ?? '-'}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <details className="min-w-[20rem] max-w-xl">
                          <summary className="cursor-pointer select-none text-sm font-medium text-primary hover:underline">
                            Ver detalle
                          </summary>
                          <div className="mt-3 rounded-lg border bg-muted/20 p-3">
                            {detailLines.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                Sin detalle disponible.
                              </p>
                            ) : (
                              <ul className="space-y-3">
                                {detailLines.map((line) => (
                                  <li
                                    key={line.id}
                                    className="grid gap-2 border-b pb-3 last:border-0 last:pb-0 sm:grid-cols-[1fr_auto]"
                                  >
                                    <div>
                                      <p className="font-medium leading-snug">
                                        {line.description}
                                      </p>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {line.concept} · {line.participantName}{' '}
                                        · {line.periodLabel}
                                      </p>
                                    </div>
                                    <p className="font-mono text-sm font-semibold sm:text-right">
                                      {formatCurrencyFromCents(
                                        line.amount,
                                        payment.currency
                                      )}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </details>
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrencyFromCents(
                          payment.amount,
                          payment.currency
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isProfessor ? (
        <section className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Pagos como profesor</h2>
            <p className="text-sm text-muted-foreground">
              Datos bancarios y pagos registrados por contaduría.
            </p>
          </div>

          {!professorProfile ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Contaduría aún no configuró tus datos bancarios.
            </p>
          ) : (
            <>
              <div className="rounded-xl border bg-muted/10 p-4">
                <h3 className="text-sm font-semibold">Datos bancarios</h3>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      Sueldo mensual
                    </dt>
                    <dd className="mt-0.5 font-mono font-semibold">
                      {formatAmount(professorProfile.monthlySalary)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      Banco
                    </dt>
                    <dd className="mt-0.5">
                      {professorProfile.bankName ?? 'Sin dato'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      CBU
                    </dt>
                    <dd className="mt-0.5 break-all font-mono text-xs">
                      {professorProfile.cbu ?? 'Sin dato'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      Alias
                    </dt>
                    <dd className="mt-0.5 break-all font-mono">
                      {professorProfile.alias ?? 'Sin dato'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      CUIT
                    </dt>
                    <dd className="mt-0.5 font-mono">
                      {professorProfile.cuit ?? 'Sin dato'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      Notas
                    </dt>
                    <dd className="mt-0.5">
                      {professorProfile.notes ?? 'Sin notas'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-semibold">
                  Historial de pagos al profesor
                </h3>
                {professorProfile.payments.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Sin pagos registrados.
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-xl border">
                    <table className="min-w-full text-sm">
                      <thead className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-left">Período</th>
                          <th className="px-4 py-3 text-right">Monto</th>
                          <th className="px-4 py-3 text-left">Estado</th>
                          <th className="px-4 py-3 text-left">Fecha pago</th>
                          <th className="px-4 py-3 text-left">Notas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {professorProfile.payments.map((payment) => (
                          <tr
                            key={payment.id}
                            className="transition-colors hover:bg-muted/20"
                          >
                            <td className="px-4 py-3 font-mono text-xs">
                              {MONTHS[payment.periodMonth - 1]}{' '}
                              {payment.periodYear}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {formatAmount(payment.amount)}
                            </td>
                            <td className="px-4 py-3">
                              <ProfessorPaymentStatusBadge
                                status={payment.status}
                              />
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {payment.paidAt
                                ? payment.paidAt.toLocaleDateString('es-AR')
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {payment.notes || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      ) : null}
    </main>
  );
}

function ProfessorPaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING: {
      label: 'Pendiente',
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    },
    PAID: {
      label: 'Pagado',
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    CANCELLED: {
      label: 'Cancelado',
      className: 'bg-rose-100 text-rose-700 border-rose-200',
    },
  };
  const config = map[status] ?? map.PENDING;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
