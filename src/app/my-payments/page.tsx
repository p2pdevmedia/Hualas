import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { formatAmount } from '@/lib/accounting';

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

export default async function MyPaymentsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;

  if (!userId || role !== 'PROFESSOR') redirect('/');

  const profile = await prisma.professorProfile.findUnique({
    where: { userId },
    include: {
      payments: {
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      },
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <header className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
          Mi cuenta
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Mis pagos</h1>
        <p className="text-sm text-muted-foreground">
          Información de sueldo y historial de pagos registrados por contaduría.
        </p>
      </header>

      {!profile ? (
        <div className="rounded-xl border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          Contaduría aún no configuró tus datos bancarios. Contactate con el
          administrador.
        </div>
      ) : (
        <>
          {/* Banking info */}
          <section className="rounded-xl border p-6 space-y-4">
            <h2 className="text-lg font-semibold">Datos bancarios</h2>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                  Sueldo mensual
                </dt>
                <dd className="mt-0.5 font-mono font-semibold text-base">
                  {formatAmount(profile.monthlySalary)}
                </dd>
              </div>
              {profile.bankName && (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    Banco
                  </dt>
                  <dd className="mt-0.5">{profile.bankName}</dd>
                </div>
              )}
              {profile.cbu && (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    CBU
                  </dt>
                  <dd className="mt-0.5 font-mono text-xs">{profile.cbu}</dd>
                </div>
              )}
              {profile.alias && (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    Alias
                  </dt>
                  <dd className="mt-0.5 font-mono">{profile.alias}</dd>
                </div>
              )}
              {profile.cuit && (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    CUIT
                  </dt>
                  <dd className="mt-0.5 font-mono">{profile.cuit}</dd>
                </div>
              )}
            </dl>
            {profile.notes && (
              <p className="text-xs text-muted-foreground border-t pt-3">
                {profile.notes}
              </p>
            )}
          </section>

          {/* Payment history */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Historial de pagos</h2>
            {profile.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin pagos registrados.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
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
                    {profile.payments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs">
                          {MONTHS[payment.periodMonth - 1]} {payment.periodYear}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {formatAmount(payment.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <PaymentStatusBadge status={payment.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {payment.paidAt
                            ? new Date(payment.paidAt).toLocaleDateString(
                                'es-AR'
                              )
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
          </section>
        </>
      )}
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
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
