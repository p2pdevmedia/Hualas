'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatAccountingDate, formatAmount } from '@/lib/accounting';

type MonthCloseSummary = {
  id: string;
  periodMonth: number;
  periodYear: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  positiveBalance: number;
  updatedAt: string | Date;
  activitySnapshot?: {
    activityReports?: Array<{
      activityId: string;
      activityName: string;
      totalParticipants: number;
      paidParticipants: number;
      pendingParticipants: number;
      paidAmount: number;
    }>;
  };
};

const MONTH_LABELS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

function periodLabel(month: number, year: number) {
  return `${MONTH_LABELS[month - 1] ?? 'mes'} ${year}`;
}

export default function MonthCloseButton({
  month,
  year,
  initialClose,
}: {
  month: number;
  year: number;
  initialClose: MonthCloseSummary | null;
}) {
  const [close, setClose] = useState<MonthCloseSummary | null>(initialClose);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleCloseMonth = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/accounting/month-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo cerrar el mes');
      }

      setClose(payload.close);
      setMessage('Fin de mes guardado correctamente.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo guardar el cierre'
      );
    } finally {
      setLoading(false);
    }
  };

  const activityReports = close?.activitySnapshot?.activityReports ?? [];
  const paidActivities = activityReports.filter(
    (activity) => activity.paidParticipants > 0
  ).length;
  const totalParticipants = activityReports.reduce(
    (sum, activity) => sum + activity.totalParticipants,
    0
  );
  const totalPaidParticipants = activityReports.reduce(
    (sum, activity) => sum + activity.paidParticipants,
    0
  );

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <LockKeyhole className="h-3.5 w-3.5" />
            Fin de mes
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Cierre de {periodLabel(month, year)}
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Guarda una foto contable del mes con balances, saldo positivo,
              cantidad de socios por actividad y socios pagos por actividad. Si
              volvés a cerrar el mismo período, se actualiza el reporte
              guardado.
            </p>
          </div>
        </div>

        <Button type="button" onClick={handleCloseMonth} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Hacer fin de mes
        </Button>
      </div>

      {close && (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: 'Ingresos guardados',
              value: formatAmount(close.totalIncome),
            },
            {
              label: 'Egresos guardados',
              value: formatAmount(close.totalExpense),
            },
            { label: 'Balance neto', value: formatAmount(close.netBalance) },
            {
              label: 'Saldo positivo',
              value: formatAmount(close.positiveBalance),
            },
            {
              label: 'Socios pagos',
              value: `${totalPaidParticipants}/${totalParticipants}`,
            },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-xl border bg-muted/20 p-4"
            >
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-xl font-semibold">{item.value}</p>
            </article>
          ))}
        </div>
      )}

      {close && activityReports.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-muted/30 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Actividad</th>
                <th className="px-4 py-2 font-medium">Socios</th>
                <th className="px-4 py-2 font-medium">Socios pagos</th>
                <th className="px-4 py-2 font-medium">Pendientes</th>
                <th className="px-4 py-2 font-medium">Cobrado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {activityReports.slice(0, 6).map((activity) => (
                <tr key={activity.activityId}>
                  <td className="px-4 py-3 font-medium">
                    {activity.activityName}
                  </td>
                  <td className="px-4 py-3">{activity.totalParticipants}</td>
                  <td className="px-4 py-3">{activity.paidParticipants}</td>
                  <td className="px-4 py-3">{activity.pendingParticipants}</td>
                  <td className="px-4 py-3">
                    {formatAmount(activity.paidAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {close && (
        <p className="mt-3 text-xs text-muted-foreground">
          Último cierre guardado: {formatAccountingDate(close.updatedAt)} ·{' '}
          {activityReports.length} actividades relevadas · {paidActivities}{' '}
          actividades con socios pagos.
        </p>
      )}

      {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
