'use client';

import { useEffect, useMemo, useState } from 'react';
import { DownloadIcon, ReloadIcon } from '@radix-ui/react-icons';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '@/components/ui/button';
import { formatAccountingDate, formatAmount } from '@/lib/accounting';

type ReportData = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  totalMp: number;
  byCategory: Record<string, { income: number; expense: number }>;
  movements: Array<{
    id: string;
    date: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    category: string;
    description: string;
    receiptNumber: string | null;
    receiptImage: string | null;
  }>;
  mpPayments: Array<{
    id: string;
    receiptDate: string | null;
    receipt: string | null;
    activityName: string;
    amount: number;
    participantName: string;
  }>;
};

const today = new Date();
const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)
  .toISOString()
  .slice(0, 10);
const defaultTo = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  .toISOString()
  .slice(0, 10);

export default function ReportsClient() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ from, to });
        const res = await fetch(`/api/accounting/reports?${params.toString()}`);
        if (!res.ok) throw new Error('No se pudo cargar el reporte');
        const json = (await res.json()) as ReportData;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const categoryRows = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.byCategory).sort(([a], [b]) =>
      a.localeCompare(b)
    );
  }, [data]);

  const downloadCsv = () => {
    if (!data) return;
    const lines = [
      ['Tipo', 'Fecha', 'Categoría', 'Descripción', 'Monto', 'Recibo'].join(
        ','
      ),
      ...data.movements.map((movement) =>
        [
          movement.type,
          movement.date,
          movement.category,
          movement.description,
          movement.amount,
          movement.receiptNumber ?? '',
        ]
          .map((field) => `"${String(field).replaceAll('"', '""')}"`)
          .join(',')
      ),
      '',
      [
        'Pagos MP',
        'Fecha',
        'Actividad',
        'Participante',
        'Monto',
        'Recibo',
      ].join(','),
      ...data.mpPayments.map((payment) =>
        [
          'MP',
          payment.receiptDate ?? '',
          payment.activityName,
          payment.participantName,
          payment.amount,
          payment.receipt ?? '',
        ]
          .map((field) => `"${String(field).replaceAll('"', '""')}"`)
          .join(',')
      ),
    ];

    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-contable-${from}-a-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    if (!data) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Reporte contable', 14, 18);
    doc.setFontSize(10);
    doc.text(`Período: ${from} a ${to}`, 14, 25);

    autoTable(doc, {
      startY: 32,
      head: [['Ingresos', 'Egresos', 'Balance', 'Cobrado MP']],
      body: [
        [
          formatAmount(data.totalIncome),
          formatAmount(data.totalExpense),
          formatAmount(data.netBalance),
          formatAmount(data.totalMp),
        ],
      ],
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Categoría', 'Ingresos', 'Egresos']],
      body: categoryRows.map(([category, totals]) => [
        category,
        formatAmount(totals.income),
        formatAmount(totals.expense),
      ]),
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Movimientos', 'Monto', 'Tipo']],
      body: data.movements
        .slice(0, 20)
        .map((movement) => [
          `${formatAccountingDate(movement.date)} - ${movement.description}`,
          formatAmount(movement.amount),
          movement.type,
        ]),
    });

    doc.save(`reporte-contable-${from}-a-${to}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Desde</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Hasta</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              <ReloadIcon className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={downloadCsv}
              disabled={!data}
            >
              <DownloadIcon className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button type="button" onClick={downloadPdf} disabled={!data}>
              <DownloadIcon className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-2xl border bg-card p-5 text-sm text-muted-foreground shadow-sm">
          <HourglassIcon className="h-4 w-4 animate-spin" />
          Cargando reporte...
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Ingresos', value: formatAmount(data.totalIncome) },
              { label: 'Egresos', value: formatAmount(data.totalExpense) },
              { label: 'Balance', value: formatAmount(data.netBalance) },
              { label: 'Cobrado MP', value: formatAmount(data.totalMp) },
            ].map((card) => (
              <article
                key={card.label}
                className="rounded-2xl border bg-card p-5 shadow-sm"
              >
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight">
                  {card.value}
                </p>
              </article>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-2xl border bg-card p-5 shadow-sm">
              <h3 className="text-lg font-semibold tracking-tight">
                Resumen por categoría
              </h3>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Categoría</th>
                      <th className="py-2 pr-4 font-medium">Ingresos</th>
                      <th className="py-2 pr-4 font-medium">Egresos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {categoryRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-8 text-center text-muted-foreground"
                        >
                          Sin movimientos para el período seleccionado.
                        </td>
                      </tr>
                    ) : (
                      categoryRows.map(([category, totals]) => (
                        <tr key={category}>
                          <td className="py-3 pr-4">{category}</td>
                          <td className="py-3 pr-4">
                            {formatAmount(totals.income)}
                          </td>
                          <td className="py-3 pr-4">
                            {formatAmount(totals.expense)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-2xl border bg-card p-5 shadow-sm">
              <h3 className="text-lg font-semibold tracking-tight">
                Pagos MP del período
              </h3>
              <div className="mt-4 space-y-3">
                {data.mpPayments.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No hay pagos MP para exportar.
                  </p>
                ) : (
                  data.mpPayments.slice(0, 6).map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-xl border bg-muted/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-medium">
                            {payment.participantName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {payment.activityName}
                          </p>
                        </div>
                        <p className="font-semibold">
                          {formatAmount(payment.amount)}
                        </p>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {payment.receiptDate
                          ? formatAccountingDate(payment.receiptDate)
                          : 'Sin fecha'}
                        {payment.receipt ? ' · Con recibo' : ''}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
