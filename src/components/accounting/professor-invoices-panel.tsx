'use client';

import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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

type ProfessorInvoice = {
  id: string;
  activityId?: string | null;
  activityName?: string | null;
  originalName: string;
  contentType: string;
  size: number;
  status: string;
  approvedAt: string | null;
  transferredAt: string | null;
  createdAt: string;
  fileUrl: string;
};

type ActivityOption = {
  id: string;
  name: string;
};

type Props = {
  professorId: string;
  initialInvoices: ProfessorInvoice[];
  activityOptions?: ActivityOption[];
  canUpload?: boolean;
  canDelete?: boolean;
  canApprove?: boolean;
  approvalDisabled?: boolean;
  defaultApprovalAmount?: number;
  title?: string;
  description?: string;
  emptyMessage?: string;
};

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function InvoiceStatusBadge({
  status,
  onClick,
  disabled = false,
}: {
  status: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING: {
      label: 'Pendiente',
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    },
    APPROVED: {
      label: 'Aprobada',
      className: 'bg-sky-100 text-sky-700 border-sky-200',
    },
    TRANSFERRED: {
      label: 'Transferida',
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
  };
  const config = map[status] ?? map.PENDING;
  const className = `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`${className} transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {config.label}
      </button>
    );
  }

  return <span className={className}>{config.label}</span>;
}

export default function ProfessorInvoicesPanel({
  professorId,
  initialInvoices,
  activityOptions = [],
  canUpload = false,
  canDelete = false,
  canApprove = false,
  approvalDisabled = false,
  defaultApprovalAmount = 0,
  title = 'Mis facturas',
  description = 'Subí tus facturas en PDF o imagen para que contaduría las revise.',
  emptyMessage = 'Todavía no hay facturas cargadas.',
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const now = new Date();
  const [invoices, setInvoices] = useState(initialInvoices);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState(
    activityOptions.length === 1 ? activityOptions[0].id : ''
  );
  const [approvalInvoiceId, setApprovalInvoiceId] = useState('');
  const [approvalMonth, setApprovalMonth] = useState(
    String(now.getMonth() + 1)
  );
  const [approvalYear, setApprovalYear] = useState(String(now.getFullYear()));
  const [approvalAmount, setApprovalAmount] = useState(
    defaultApprovalAmount > 0 ? String(defaultApprovalAmount / 100) : ''
  );
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvingId, setApprovingId] = useState('');
  const [approvalError, setApprovalError] = useState('');

  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  useEffect(() => {
    if (activityOptions.length === 1) {
      setSelectedActivityId(activityOptions[0].id);
      return;
    }

    setSelectedActivityId((current) =>
      activityOptions.some((activity) => activity.id === current) ? current : ''
    );
  }, [activityOptions]);

  const approvalAmountCents = (() => {
    const pesos = Number(approvalAmount);
    return Number.isFinite(pesos) ? Math.round(pesos * 100) : 0;
  })();

  const uploadFile = async (file: File) => {
    setError('');
    setSuccess('');

    if (file.size > 10 * 1024 * 1024) {
      setError('La factura debe pesar menos de 10 MB.');
      return;
    }

    if (!selectedActivityId) {
      setError('Seleccioná la actividad de la factura.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('activityId', selectedActivityId);
    setUploading(true);

    try {
      const res = await fetch(`/api/professors/${professorId}/invoices`, {
        method: 'POST',
        body: formData,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? 'No se pudo subir la factura');
      }
      setInvoices((prev) => [body.invoice as ProfessorInvoice, ...prev]);
      setSuccess('Factura subida correctamente.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir factura');
    } finally {
      setUploading(false);
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    setError('');
    setSuccess('');
    setDeletingId(invoiceId);

    try {
      const res = await fetch(`/api/professor-invoices/${invoiceId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('No se pudo eliminar la factura');
      setInvoices((prev) => prev.filter((invoice) => invoice.id !== invoiceId));
      setSuccess('Factura eliminada correctamente.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al eliminar factura'
      );
    } finally {
      setDeletingId('');
    }
  };

  const toggleApproval = (invoiceId: string) => {
    setError('');
    setSuccess('');
    setApprovalError('');
    setApprovalInvoiceId((current) => (current === invoiceId ? '' : invoiceId));
  };

  const approveInvoice = async (
    e: FormEvent<HTMLFormElement>,
    invoice: ProfessorInvoice
  ) => {
    e.preventDefault();
    setApprovalError('');
    setSuccess('');

    if (approvalDisabled) {
      setApprovalError(
        'Aplicá las migraciones pendientes antes de aprobar facturas.'
      );
      return;
    }

    setApprovingId(invoice.id);
    try {
      const res = await fetch(`/api/professors/${professorId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          periodMonth: Number(approvalMonth),
          periodYear: Number(approvalYear),
          amount: approvalAmountCents,
          notes: approvalNotes.trim() || null,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? 'No se pudo aprobar');

      setInvoices((prev) =>
        prev.map((current) =>
          current.id === invoice.id
            ? {
                ...current,
                status: body.payment?.invoice?.status ?? 'APPROVED',
                approvedAt:
                  body.payment?.invoice?.approvedAt ?? new Date().toISOString(),
                transferredAt: body.payment?.invoice?.transferredAt ?? null,
              }
            : current
        )
      );
      setApprovalInvoiceId('');
      setApprovalNotes('');
      setSuccess('Factura aprobada correctamente.');
      router.refresh();
    } catch (err) {
      setApprovalError(
        err instanceof Error ? err.message : 'Error al aprobar factura'
      );
    } finally {
      setApprovingId('');
    }
  };

  return (
    <section className="rounded-xl border p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Facturas
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {canUpload && (
          <div className="flex flex-col gap-2 sm:min-w-[260px]">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Actividad</span>
              <select
                value={selectedActivityId}
                onChange={(e) => setSelectedActivityId(e.target.value)}
                disabled={uploading || activityOptions.length === 0}
                className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                required
              >
                {activityOptions.length === 0 ? (
                  <option value="">Sin actividades asignadas</option>
                ) : (
                  <>
                    {activityOptions.length > 1 && (
                      <option value="">Seleccionar actividad</option>
                    )}
                    {activityOptions.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </label>
            <Button
              type="button"
              onClick={() => {
                if (!selectedActivityId) {
                  setError('Seleccioná la actividad de la factura.');
                  return;
                }
                fileInputRef.current?.click();
              }}
              disabled={uploading || activityOptions.length === 0}
              className="shrink-0"
            >
              {uploading ? 'Subiendo...' : 'Subir factura'}
            </Button>
          </div>
        )}
      </div>

      {canUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
          }}
        />
      )}

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Archivo</th>
                <th className="px-4 py-3 text-left">Actividad</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Tamaño</th>
                <th className="px-4 py-3 text-left">Cargada</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((invoice) => (
                <Fragment key={invoice.id}>
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium max-w-[260px] truncate">
                      {invoice.originalName}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[220px] truncate">
                      {invoice.activityName ?? 'Sin actividad'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {invoice.contentType === 'application/pdf'
                        ? 'PDF'
                        : 'Imagen'}
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge
                        status={invoice.status}
                        disabled={approvalDisabled}
                        onClick={
                          canApprove && invoice.status === 'PENDING'
                            ? () => toggleApproval(invoice.id)
                            : undefined
                        }
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {formatFileSize(invoice.size)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(invoice.createdAt).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          asChild
                          variant="outline"
                          className="px-3 py-1 text-xs"
                        >
                          <a
                            href={invoice.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ver
                          </a>
                        </Button>
                        {canDelete && invoice.status === 'PENDING' && (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={deletingId === invoice.id}
                            onClick={() => deleteInvoice(invoice.id)}
                            className="text-rose-600 border-rose-200 hover:bg-rose-50 px-3 py-1 text-xs"
                          >
                            {deletingId === invoice.id
                              ? 'Eliminando...'
                              : 'Eliminar'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {canApprove &&
                    invoice.status === 'PENDING' &&
                    approvalInvoiceId === invoice.id && (
                      <tr
                        key={`${invoice.id}-approval`}
                        className="bg-muted/10"
                      >
                        <td colSpan={7} className="px-4 py-4">
                          <form
                            onSubmit={(e) => approveInvoice(e, invoice)}
                            className="space-y-4"
                          >
                            <div className="grid gap-4 sm:grid-cols-3">
                              <label className="space-y-1 text-sm">
                                <span className="font-medium">Mes</span>
                                <select
                                  value={approvalMonth}
                                  onChange={(e) =>
                                    setApprovalMonth(e.target.value)
                                  }
                                  className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                  required
                                >
                                  {MONTHS.map((month, index) => (
                                    <option key={month} value={index + 1}>
                                      {month}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="space-y-1 text-sm">
                                <span className="font-medium">Año</span>
                                <input
                                  type="number"
                                  min="2020"
                                  max="2100"
                                  value={approvalYear}
                                  onChange={(e) =>
                                    setApprovalYear(e.target.value)
                                  }
                                  className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                  required
                                />
                              </label>

                              <label className="space-y-1 text-sm">
                                <span className="font-medium">
                                  Monto (pesos)
                                </span>
                                <input
                                  type="number"
                                  min="1"
                                  step="0.01"
                                  value={approvalAmount}
                                  onChange={(e) =>
                                    setApprovalAmount(e.target.value)
                                  }
                                  className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                  required
                                />
                                {approvalAmountCents > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatAmount(approvalAmountCents)}
                                  </span>
                                )}
                              </label>
                            </div>

                            <label className="space-y-1 text-sm block">
                              <span className="font-medium">Notas</span>
                              <input
                                type="text"
                                value={approvalNotes}
                                onChange={(e) =>
                                  setApprovalNotes(e.target.value)
                                }
                                className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Opcional"
                                maxLength={500}
                              />
                            </label>

                            {approvalError && (
                              <p className="text-sm text-destructive">
                                {approvalError}
                              </p>
                            )}

                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="submit"
                                disabled={
                                  approvalDisabled || approvingId === invoice.id
                                }
                              >
                                {approvingId === invoice.id
                                  ? 'Aprobando...'
                                  : 'Aprobar factura'}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setApprovalInvoiceId('')}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canUpload && (
        <p className="text-xs text-muted-foreground">
          Formatos permitidos: PDF, JPG, PNG o WebP. Tamaño máximo: 10 MB.
        </p>
      )}
    </section>
  );
}
