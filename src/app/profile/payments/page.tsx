import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getManualPaymentRawData } from '@/lib/manual-payments';
import { formatManualPaymentStatus } from '@/lib/manual-payment-ui';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function ProfilePaymentsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const payments = await prisma.activityParticipant.findMany({
    where: {
      OR: [{ userId: session.user.id }, { child: { userId: session.user.id } }],
      receipt: { not: null },
    },
    orderBy: { receiptDate: 'desc' },
    include: {
      activity: { select: { name: true, price: true } },
      user: { select: { name: true, lastName: true } },
      child: { select: { name: true, lastName: true } },
    },
  });

  const manualPayments = await prisma.payment.findMany({
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
          items: {
            select: {
              description: true,
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
  });

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
                        {formatCurrency(payment.activity.price)}
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
                  <th className="px-3 py-2 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {manualPayments.map((payment) => {
                  const rawData = getManualPaymentRawData(payment.rawData);
                  const status = formatManualPaymentStatus(payment.status);
                  const activityNames = payment.order.items
                    .filter(
                      (item) => item.billableConcept.code === 'ACTIVITY_FEE'
                    )
                    .map((item) => item.activity?.name ?? item.description)
                    .filter((name): name is string => Boolean(name));

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
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(payment.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
