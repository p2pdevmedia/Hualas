'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatAmount, getAccountingUserProfileHref } from '@/lib/accounting';
import PersonLink from '@/components/accounting/person-link';

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

type Payment = {
  id: string;
  periodMonth: number;
  periodYear: number;
  amount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  paidAt: string | null;
  notes: string | null;
  createdBy: { id: string; name: string | null; lastName: string | null };
  invoice?: {
    id: string;
    status: string;
    approvedAt: string | null;
    transferredAt: string | null;
  } | null;
};

type Invoice = {
  id: string;
  originalName: string;
  status: string;
  createdAt: string;
};

type Props = {
  professorId: string;
  profile: {
    monthlySalary: number;
    bankName: string | null;
    cbu: string | null;
    alias: string | null;
    cuit: string | null;
    notes: string | null;
  } | null;
  payments: Payment[];
  invoices: Invoice[];
};

export default function ProfessorProfileForm({
  professorId,
  profile,
  payments: initialPayments,
  invoices: initialInvoices,
}: Props) {
  const router = useRouter();

  // Profile fields
  const [monthlySalary, setMonthlySalary] = useState(
    profile ? (profile.monthlySalary / 100).toString() : ''
  );
  const [bankName, setBankName] = useState(profile?.bankName ?? '');
  const [cbu, setCbu] = useState(profile?.cbu ?? '');
  const [alias, setAlias] = useState(profile?.alias ?? '');
  const [cuit, setCuit] = useState(profile?.cuit ?? '');
  const [notes, setNotes] = useState(profile?.notes ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const salaryAmountCents = useMemo(() => {
    const p = Number(monthlySalary);
    return Number.isFinite(p) ? Math.round(p * 100) : 0;
  }, [monthlySalary]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileSaving(true);
    try {
      const res = await fetch(`/api/professors/${professorId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlySalary: salaryAmountCents,
          bankName: bankName.trim() || null,
          cbu: cbu.trim() || null,
          alias: alias.trim() || null,
          cuit: cuit.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? 'No se pudo guardar');
      setProfileSuccess('Perfil guardado correctamente.');
      router.refresh();
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setProfileSaving(false);
    }
  };

  // New payment
  const now = new Date();
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const pendingInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.status === 'PENDING'),
    [invoices]
  );
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(
    pendingInvoices[0]?.id ?? ''
  );
  const [newMonth, setNewMonth] = useState(String(now.getMonth() + 1));
  const [newYear, setNewYear] = useState(String(now.getFullYear()));
  const [newAmount, setNewAmount] = useState(
    profile ? (profile.monthlySalary / 100).toString() : ''
  );
  const [newNotes, setNewNotes] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [confirmDeletePaymentId, setConfirmDeletePaymentId] = useState('');

  const newAmountCents = useMemo(() => {
    const p = Number(newAmount);
    return Number.isFinite(p) ? Math.round(p * 100) : 0;
  }, [newAmount]);

  const createPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');
    if (!selectedInvoiceId) {
      setPaymentError('SeleccionÃ¡ una factura pendiente para aprobar.');
      return;
    }
    setPaymentSaving(true);
    try {
      const res = await fetch(`/api/professors/${professorId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoiceId,
          periodMonth: Number(newMonth),
          periodYear: Number(newYear),
          amount: newAmountCents,
          notes: newNotes.trim() || null,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? 'No se pudo crear el pago');
      setPayments((prev) => [body.payment as Payment, ...prev]);
      setInvoices((prev) =>
        prev.map((invoice) =>
          invoice.id === selectedInvoiceId
            ? { ...invoice, status: 'APPROVED' }
            : invoice
        )
      );
      setSelectedInvoiceId('');
      setNewNotes('');
      router.refresh();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Error al crear');
    } finally {
      setPaymentSaving(false);
    }
  };

  const updatePaymentStatus = async (
    paymentId: string,
    status: 'PENDING' | 'PAID' | 'CANCELLED'
  ) => {
    const res = await fetch(`/api/professor-payments/${paymentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return;
    setPayments((prev) =>
      prev.map((p) =>
        p.id === paymentId
          ? { ...p, status: body.payment.status, paidAt: body.payment.paidAt }
          : p
      )
    );
    if (body.payment.invoice?.id) {
      setInvoices((prev) =>
        prev.map((invoice) =>
          invoice.id === body.payment.invoice.id
            ? { ...invoice, status: body.payment.invoice.status }
            : invoice
        )
      );
    }
    router.refresh();
  };

  const deletePayment = async (paymentId: string) => {
    const res = await fetch(`/api/professor-payments/${paymentId}`, {
      method: 'DELETE',
    });
    if (!res.ok) return;
    const payment = payments.find((p) => p.id === paymentId);
    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    if (payment?.invoice?.id) {
      setInvoices((prev) =>
        prev.map((invoice) =>
          invoice.id === payment.invoice?.id
            ? { ...invoice, status: 'PENDING' }
            : invoice
        )
      );
    }
    router.refresh();
  };

  return (
    <div className="space-y-10">
      {/* Profile / Banking */}
      <section className="rounded-xl border p-6 space-y-4">
        <h3 className="text-lg font-semibold">Datos bancarios y sueldo</h3>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Sueldo mensual (pesos)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              {salaryAmountCents > 0 && (
                <span className="text-xs text-muted-foreground">
                  {formatAmount(salaryAmountCents)}
                </span>
              )}
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Banco</span>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ej: Banco Nación"
                maxLength={100}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">CBU</span>
              <input
                type="text"
                value={cbu}
                onChange={(e) => setCbu(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="22 dígitos"
                maxLength={22}
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Alias</span>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ej: NOMBRE.APELLIDO.BANCO"
                maxLength={50}
              />
            </label>
          </div>

          <label className="space-y-1 text-sm block">
            <span className="font-medium">CUIT</span>
            <input
              type="text"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="XX-XXXXXXXX-X"
              maxLength={13}
            />
          </label>

          <label className="space-y-1 text-sm block">
            <span className="font-medium">Observaciones</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={500}
            />
          </label>

          {profileError && (
            <p className="text-sm text-destructive">{profileError}</p>
          )}
          {profileSuccess && (
            <p className="text-sm text-emerald-600">{profileSuccess}</p>
          )}

          <Button type="submit" disabled={profileSaving}>
            {profileSaving ? 'Guardando...' : 'Guardar datos'}
          </Button>
        </form>
      </section>

      {/* Invoice approval */}
      <section className="rounded-xl border p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Aprobar factura</h3>
          <p className="text-sm text-muted-foreground">
            ContadurÃ­a aprueba una factura cargada por el profesor. TesorerÃ­a
            marca la transferencia desde el historial.
          </p>
        </div>
        <form onSubmit={createPayment} className="space-y-4">
          <label className="space-y-1 text-sm block">
            <span className="font-medium">Factura pendiente</span>
            <select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={pendingInvoices.length === 0}
              required
            >
              <option value="">Seleccionar factura</option>
              {pendingInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.originalName} -{' '}
                  {new Date(invoice.createdAt).toLocaleDateString('es-AR')}
                </option>
              ))}
            </select>
          </label>

          {pendingInvoices.length === 0 && (
            <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              No hay facturas pendientes. El profesor tiene que cargar una
              factura antes de que contadurÃ­a pueda aprobar el pago.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Mes</span>
              <select
                value={newMonth}
                onChange={(e) => setNewMonth(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>
                    {m}
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
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Monto (pesos)</span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              {newAmountCents > 0 && (
                <span className="text-xs text-muted-foreground">
                  {formatAmount(newAmountCents)}
                </span>
              )}
            </label>
          </div>

          <label className="space-y-1 text-sm block">
            <span className="font-medium">Notas</span>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Opcional"
              maxLength={500}
            />
          </label>

          {paymentError && (
            <p className="text-sm text-destructive">{paymentError}</p>
          )}

          <Button
            type="submit"
            disabled={paymentSaving || pendingInvoices.length === 0}
          >
            {paymentSaving ? 'Aprobando...' : 'Aprobar factura'}
          </Button>
        </form>
      </section>

      {/* Payment History */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Historial de pagos</h3>
        {payments.length === 0 ? (
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
                  <th className="px-4 py-3 text-left">Fecha transferencia</th>
                  <th className="px-4 py-3 text-left">Notas</th>
                  <th className="px-4 py-3 text-left">Registrado por</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((payment) => (
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
                        ? new Date(payment.paidAt).toLocaleDateString('es-AR')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[150px] truncate">
                      {payment.notes || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <PersonLink
                        href={getAccountingUserProfileHref(
                          payment.createdBy.id
                        )}
                        className="text-link hover:underline"
                      >
                        {`${payment.createdBy.name ?? ''} ${payment.createdBy.lastName ?? ''}`.trim() ||
                          '—'}
                      </PersonLink>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        {payment.status === 'PENDING' && (
                          <Button
                            variant="outline"
                            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 px-3 py-1 text-xs"
                            onClick={() =>
                              updatePaymentStatus(payment.id, 'PAID')
                            }
                          >
                            Transferido
                          </Button>
                        )}
                        {payment.status === 'PAID' && (
                          <Button
                            variant="outline"
                            className="px-3 py-1 text-xs"
                            onClick={() =>
                              updatePaymentStatus(payment.id, 'PENDING')
                            }
                          >
                            Revertir
                          </Button>
                        )}
                        {payment.status !== 'CANCELLED' && (
                          <Button
                            variant="outline"
                            className="text-rose-600 border-rose-200 hover:bg-rose-50 px-3 py-1 text-xs"
                            onClick={() =>
                              setConfirmDeletePaymentId(payment.id)
                            }
                          >
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {confirmDeletePaymentId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-lg max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold mb-2">Eliminar pago</h2>
            <p className="text-muted-foreground mb-6">
              ¿Estás seguro de que querés eliminar este registro de pago? Esta
              acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeletePaymentId('')}
                className="px-4 py-2 rounded-full border border-border hover:bg-muted transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const id = confirmDeletePaymentId;
                  setConfirmDeletePaymentId('');
                  deletePayment(id);
                }}
                className="px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING: {
      label: 'Aprobada',
      className: 'bg-sky-100 text-sky-700 border-sky-200',
    },
    PAID: {
      label: 'Transferido',
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
