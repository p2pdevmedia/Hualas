'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ManualPaymentDetail from '@/components/accounting/manual-payment-detail';
import { Button } from '@/components/ui/button';
import {
  formatManualPaymentStatus,
  type ManualPaymentSummary,
} from '@/lib/manual-payment-ui';
import { useToast } from '@/hooks/use-toast';

type ManualPaymentsDashboardProps = {
  payments: ManualPaymentSummary[];
  total: number;
  page: number;
  pageSize: number;
  status: string | null;
};

function formatPesos(amount: number, currency: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ManualPaymentsDashboard({
  payments,
  total,
  page,
  pageSize,
  status,
}: ManualPaymentsDashboardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState(payments);
  const [selectedId, setSelectedId] = useState<string | null>(
    payments[0]?.id ?? null
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const selectedPayment = useMemo(
    () => items.find((payment) => payment.id === selectedId) ?? null,
    [items, selectedId]
  );

  const updatePayment = (
    paymentId: string,
    updater: (payment: ManualPaymentSummary) => ManualPaymentSummary | null
  ) => {
    setItems((current) =>
      current
        .map((payment) =>
          payment.id === paymentId ? updater(payment) : payment
        )
        .filter((payment): payment is ManualPaymentSummary => Boolean(payment))
    );
  };

  const handleApprove = async (paymentId: string) => {
    setBusyId(paymentId);
    try {
      const response = await fetch(
        `/api/accounting/manual-payments/${paymentId}/approve`,
        {
          method: 'POST',
        }
      );
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error || 'No se pudo aprobar el pago.');
      }

      updatePayment(paymentId, (payment) => ({
        ...payment,
        status: 'APPROVED',
        paidAt: new Date(),
        accountantComments: payment.accountantComments,
      }));
      toast({
        title: 'Pago aprobado',
        description: 'El comprobante pasó a estado aprobado.',
      });

      if (status === 'PENDING') {
        setItems((current) =>
          current.filter((payment) => payment.id !== paymentId)
        );
        setSelectedId((current) => (current === paymentId ? null : current));
      }
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'No se pudo aprobar el pago.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (paymentId: string, comment: string) => {
    setBusyId(paymentId);
    try {
      const response = await fetch(
        `/api/accounting/manual-payments/${paymentId}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment }),
        }
      );
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error || 'No se pudo rechazar el pago.');
      }

      updatePayment(paymentId, (payment) => ({
        ...payment,
        status: 'REJECTED',
        accountantComments: comment || payment.accountantComments,
      }));
      toast({
        title: 'Pago rechazado',
        description: 'El comentario quedó registrado en el historial.',
      });

      if (status === 'PENDING') {
        setItems((current) =>
          current.filter((payment) => payment.id !== paymentId)
        );
        setSelectedId((current) => (current === paymentId ? null : current));
      }
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'No se pudo rechazar el pago.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_1.2fr]">
      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Pagos manuales</h2>
          <p className="text-sm text-muted-foreground">
            {total} pago{total === 1 ? '' : 's'}
            {status ? ` · filtro ${status}` : ''}
          </p>
        </div>

        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No hay pagos para mostrar con este filtro.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((payment) => {
              const statusInfo = formatManualPaymentStatus(payment.status);
              const active = payment.id === selectedId;

              return (
                <button
                  key={payment.id}
                  type="button"
                  onClick={() => setSelectedId(payment.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    active
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium">{payment.customerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.activities[0]?.name ?? 'Sin actividad'}
                        {payment.activities.length > 1
                          ? ` +${payment.activities.length - 1}`
                          : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.customerEmail}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatPesos(payment.amount / 100, payment.currency)}
                      </p>
                      <span
                        className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t pt-4 text-sm text-muted-foreground">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1}
              onClick={() => {
                const next = new URL(window.location.href);
                next.searchParams.set('page', String(page - 1));
                window.location.href = next.toString();
              }}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => {
                const next = new URL(window.location.href);
                next.searchParams.set('page', String(page + 1));
                window.location.href = next.toString();
              }}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </section>

      <ManualPaymentDetail
        payment={selectedPayment}
        onApprove={handleApprove}
        onReject={handleReject}
        busy={busyId === selectedPayment?.id}
      />
    </div>
  );
}
