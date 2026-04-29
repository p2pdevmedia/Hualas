import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Historial de pagos</h1>
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
                  const participantName = [participant?.name, participant?.lastName]
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
                      <td className="px-3 py-2">{participantName || 'Sin nombre'}</td>
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
    </main>
  );
}
