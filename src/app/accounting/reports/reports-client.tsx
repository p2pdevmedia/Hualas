'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, FileDown, Loader2, RefreshCw } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '@/components/ui/button';
import {
  centsToPesos,
  formatAccountingDate,
  formatAmount,
} from '@/lib/accounting';
import { buildAccountingCategoryTotals } from '@/lib/accounting-summary';

type ExportSource = 'movements' | 'manualPayments' | 'mpPayments';
type ChartMode = 'month' | 'year';

type TimelineBucket = {
  key: string;
  label: string;
  income: number;
  expense: number;
};

type ReportData = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  totalManualPayments: number;
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
  manualPayments: Array<{
    id: string;
    paidAt: string | null;
    amount: number;
    customerName: string;
    activities: string[];
    receiptUrl: string | null;
  }>;
  mpPayments: Array<{
    id: string;
    receiptDate: string | null;
    receipt: string | null;
    activityName: string;
    amount: number;
    participantName: string;
  }>;
  entries: Array<{
    id: string;
    date: string;
    source: 'Movimiento manual' | 'Pago manual' | 'Mercado Pago';
    type: 'INCOME' | 'EXPENSE';
    category: string;
    description: string;
    amount: number;
    reference: string | null;
  }>;
};

const today = new Date();
const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)
  .toISOString()
  .slice(0, 10);
const defaultTo = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  .toISOString()
  .slice(0, 10);

const MONTH_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const;

function buildTimelineBuckets(entries: ReportData['entries'], mode: ChartMode) {
  const buckets = new Map<string, TimelineBucket>();

  for (const entry of entries) {
    const key =
      mode === 'year' ? entry.date.slice(0, 4) : entry.date.slice(0, 7);
    const bucket =
      buckets.get(key) ??
      ({
        key,
        label:
          mode === 'year'
            ? key
            : (() => {
                const year = Number(key.slice(0, 4));
                const month = Number(key.slice(5, 7));
                return `${MONTH_LABELS[month - 1]} ${year}`;
              })(),
        income: 0,
        expense: 0,
      } satisfies TimelineBucket);

    if (entry.type === 'INCOME') {
      bucket.income += entry.amount;
    } else {
      bucket.expense += entry.amount;
    }

    buckets.set(key, bucket);
  }

  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function formatTimelineValue(value: number) {
  return formatAmount(value);
}

function ReportsTimelineChart({
  buckets,
  mode,
  onModeChange,
}: {
  buckets: TimelineBucket[];
  mode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
}) {
  const maxValue = Math.max(
    0,
    ...buckets.map((bucket) => Math.max(bucket.income, bucket.expense))
  );
  const totalIncome = buckets.reduce((sum, bucket) => sum + bucket.income, 0);
  const totalExpense = buckets.reduce((sum, bucket) => sum + bucket.expense, 0);
  const periodLabel =
    buckets.length === 1
      ? mode === 'month'
        ? 'mes'
        : 'año'
      : mode === 'month'
        ? 'meses'
        : 'años';

  return (
    <article className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">
            Gráficas de reportes
          </h3>
          <p className="text-sm text-muted-foreground">
            Compará ingresos y egresos agrupados por mes o por año.
          </p>
        </div>

        <div className="inline-flex rounded-full border bg-muted/30 p-1">
          <Button
            type="button"
            variant={mode === 'month' ? 'primary' : 'ghost'}
            className="h-9 px-4"
            onClick={() => onModeChange('month')}
          >
            Por mes
          </Button>
          <Button
            type="button"
            variant={mode === 'year' ? 'primary' : 'ghost'}
            className="h-9 px-4"
            onClick={() => onModeChange('year')}
          >
            Por año
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="overflow-x-auto rounded-2xl border bg-background/70 p-4">
          {buckets.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No hay datos para mostrar en esta vista.
            </p>
          ) : (
            <div className="min-w-[640px]">
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatTimelineValue(0)}</span>
                <span>{formatTimelineValue(maxValue)}</span>
              </div>

              <div className="flex items-end gap-3">
                {buckets.map((bucket) => {
                  const incomeHeight =
                    maxValue === 0 ? 0 : (bucket.income / maxValue) * 100;
                  const expenseHeight =
                    maxValue === 0 ? 0 : (bucket.expense / maxValue) * 100;

                  return (
                    <div
                      key={bucket.key}
                      className="flex w-20 shrink-0 flex-col items-center gap-2"
                    >
                      <div
                        className="flex h-56 w-full items-end gap-2 rounded-2xl bg-muted/30 px-3 pb-3 pt-4"
                        aria-label={`${bucket.label}: ingresos ${formatTimelineValue(
                          bucket.income
                        )}, egresos ${formatTimelineValue(bucket.expense)}`}
                      >
                        <div className="flex h-full flex-1 items-end">
                          <div
                            className="w-full rounded-t-lg bg-emerald-500"
                            style={{ height: `${incomeHeight}%` }}
                            title={`${bucket.label} - Ingresos ${formatTimelineValue(
                              bucket.income
                            )}`}
                          />
                        </div>
                        <div className="flex h-full flex-1 items-end">
                          <div
                            className="w-full rounded-t-lg bg-rose-500"
                            style={{ height: `${expenseHeight}%` }}
                            title={`${bucket.label} - Egresos ${formatTimelineValue(
                              bucket.expense
                            )}`}
                          />
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="text-xs font-medium leading-tight">
                          {bucket.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatTimelineValue(bucket.income - bucket.expense)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-sm font-medium">Leyenda</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <span>Ingresos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500" />
                <span>Egresos</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Vista actual</p>
            <p className="mt-2 text-2xl font-bold tracking-tight">
              {buckets.length} {periodLabel}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ingresos {formatTimelineValue(totalIncome)}
            </p>
            <p className="text-xs text-muted-foreground">
              Egresos {formatTimelineValue(totalExpense)}
            </p>
            <p className="mt-2 text-sm font-medium">
              Balance {formatTimelineValue(totalIncome - totalExpense)}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ReportsClient() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chartMode, setChartMode] = useState<ChartMode>('month');
  const [exportSources, setExportSources] = useState<
    Record<ExportSource, boolean>
  >({
    movements: true,
    manualPayments: true,
    mpPayments: true,
  });

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

  const chartBuckets = useMemo(() => {
    if (!data) return [];
    return buildTimelineBuckets(data.entries, chartMode);
  }, [data, chartMode]);

  const selectedExportEntries = useMemo(() => {
    if (!data) return [];

    return data.entries.filter((entry) => {
      switch (entry.source) {
        case 'Movimiento manual':
          return exportSources.movements;
        case 'Pago manual':
          return exportSources.manualPayments;
        case 'Mercado Pago':
          return exportSources.mpPayments;
      }
    });
  }, [data, exportSources]);

  const selectedExportCategoryRows = useMemo(() => {
    return Object.entries(
      buildAccountingCategoryTotals(selectedExportEntries)
    ).sort(([a], [b]) => a.localeCompare(b));
  }, [selectedExportEntries]);

  const selectedExportSummary = useMemo(
    () =>
      selectedExportEntries.reduce(
        (acc, entry) => {
          if (entry.type === 'INCOME') {
            acc.totalIncome += entry.amount;
          } else {
            acc.totalExpense += entry.amount;
          }

          if (entry.source === 'Pago manual') {
            acc.totalManualPayments += entry.amount;
          }

          if (entry.source === 'Mercado Pago') {
            acc.totalMp += entry.amount;
          }

          return acc;
        },
        {
          totalIncome: 0,
          totalExpense: 0,
          totalManualPayments: 0,
          totalMp: 0,
        }
      ),
    [selectedExportEntries]
  );

  const canExport = selectedExportEntries.length > 0;

  const downloadCsv = () => {
    if (!data || !canExport) return;
    const formatCsvAmount = (value: number) => String(centsToPesos(value));
    const lines = [
      [
        'Origen',
        'Tipo',
        'Fecha',
        'Categoría',
        'Descripción',
        'Monto',
        'Referencia',
      ].join(','),
      ...selectedExportEntries.map((entry) =>
        [
          entry.source,
          entry.type,
          entry.date,
          entry.category,
          entry.description,
          formatCsvAmount(entry.amount),
          entry.reference ?? '',
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
    if (!data || !canExport) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Reporte contable', 14, 18);
    doc.setFontSize(10);
    doc.text(`Período: ${from} a ${to}`, 14, 25);

    autoTable(doc, {
      startY: 32,
      head: [
        ['Ingresos', 'Egresos', 'Balance', 'Pagos manuales', 'Cobrado MP'],
      ],
      body: [
        [
          formatAmount(selectedExportSummary.totalIncome),
          formatAmount(selectedExportSummary.totalExpense),
          formatAmount(
            selectedExportSummary.totalIncome -
              selectedExportSummary.totalExpense
          ),
          formatAmount(selectedExportSummary.totalManualPayments),
          formatAmount(selectedExportSummary.totalMp),
        ],
      ],
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Categoría', 'Ingresos', 'Egresos']],
      body: selectedExportCategoryRows.map(([category, totals]) => [
        category,
        formatAmount(totals.income),
        formatAmount(totals.expense),
      ]),
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Origen', 'Fecha', 'Descripción', 'Monto', 'Referencia']],
      body: selectedExportEntries
        .slice(0, 20)
        .map((entry) => [
          entry.source,
          formatAccountingDate(entry.date),
          `${entry.category} - ${entry.description}`,
          formatAmount(entry.amount),
          entry.reference ?? '',
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
              onClick={() =>
                setExportSources({
                  movements: true,
                  manualPayments: true,
                  mpPayments: true,
                })
              }
            >
              Seleccionar todo
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setExportSources({
                  movements: false,
                  manualPayments: false,
                  mpPayments: false,
                })
              }
            >
              Limpiar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={downloadCsv}
              disabled={!data || !canExport}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button
              type="button"
              onClick={downloadPdf}
              disabled={!data || !canExport}
            >
              <FileDown className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
          <span className="text-sm font-medium">Exportar:</span>
          {(
            [
              { key: 'movements', label: 'Movimientos' },
              { key: 'manualPayments', label: 'Pagos manuales' },
              { key: 'mpPayments', label: 'Mercado Pago' },
            ] as const
          ).map((option) => (
            <label
              key={option.key}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
            >
              <input
                type="checkbox"
                checked={exportSources[option.key]}
                onChange={() =>
                  setExportSources((current) => ({
                    ...current,
                    [option.key]: !current[option.key],
                  }))
                }
              />
              {option.label}
            </label>
          ))}
          <span className="text-xs text-muted-foreground">
            {selectedExportEntries.length} registro
            {selectedExportEntries.length === 1 ? '' : 's'} seleccionado
            {selectedExportEntries.length === 1 ? '' : 's'} para exportar
          </span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-2xl border bg-card p-5 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
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
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              { label: 'Ingresos', value: formatAmount(data.totalIncome) },
              { label: 'Egresos', value: formatAmount(data.totalExpense) },
              { label: 'Balance', value: formatAmount(data.netBalance) },
              {
                label: 'Pagos manuales verificados',
                value: formatAmount(data.totalManualPayments),
              },
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

          <ReportsTimelineChart
            buckets={chartBuckets}
            mode={chartMode}
            onModeChange={setChartMode}
          />

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-2xl border bg-card p-5 shadow-sm">
              <h3 className="text-lg font-semibold tracking-tight">
                Resumen por categoría
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Los pagos manuales y de Mercado Pago también aparecen como
                categorías propias dentro de los ingresos.
              </p>
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
