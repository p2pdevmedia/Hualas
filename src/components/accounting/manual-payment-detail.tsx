'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import AuditTrail, { type AuditTrailEntry } from '@/components/audit-trail';
import PersonLink from '@/components/accounting/person-link';
import {
  formatCurrencyFromCents,
  getAccountingUserProfileHref,
} from '@/lib/accounting';
import {
  formatManualPaymentStatus,
  type ManualPaymentSummary,
} from '@/lib/manual-payment-ui';

type ManualPaymentDetailProps = {
  payment: ManualPaymentSummary | null;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, comment: string) => Promise<void>;
  busy?: boolean;
};

export default function ManualPaymentDetail({
  payment,
  onApprove,
  onReject,
  busy,
}: ManualPaymentDetailProps) {
  const [comment, setComment] = useState('');

  const auditTrail = useMemo<AuditTrailEntry[]>(() => {
    if (!payment) return [];

    return payment.reviews.map((entry) => ({
      title:
        entry.action === 'uploaded'
          ? 'Comprobante subido'
          : entry.result === 'approved'
            ? 'Pago aprobado'
            : 'Pago rechazado',
      by: entry.by,
      at: entry.at,
      comment: entry.comment,
      variant:
        entry.result === 'approved'
          ? 'approved'
          : entry.result === 'rejected'
            ? 'rejected'
            : 'default',
    }));
  }, [payment]);

  if (!payment) {
    return (
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Seleccioná un pago para ver el detalle.
        </p>
      </section>
    );
  }

  const status = formatManualPaymentStatus(payment.status);
  const proofIsPdf =
    payment.proofContentType === 'application/pdf' ||
    payment.proofFileName?.toLowerCase().endsWith('.pdf');
  const socialFeeAmount = payment.rawData.socialFeeAmount ?? 0;
  const socialFeeParticipants =
    payment.rawData.socialFeeParticipants?.length ?? 0;

  return (
    <section className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}
          >
            {status.label}
          </span>
          {payment.previousRejections > 0 ? (
            <span className="rounded-full border border-muted-foreground/20 bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {payment.previousRejections} rechazo
              {payment.previousRejections === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
        <div>
          <h3 className="text-xl font-semibold">
            <PersonLink
              href={
                payment.responsibleUserId
                  ? getAccountingUserProfileHref(payment.responsibleUserId)
                  : null
              }
              className="text-link hover:underline"
            >
              {payment.customerName}
            </PersonLink>
          </h3>
          <p className="text-sm text-muted-foreground">
            {payment.customerEmail}
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border bg-muted/10">
            {payment.receiptUrl ? (
              proofIsPdf ? (
                <iframe
                  title={`Comprobante ${payment.id}`}
                  src={payment.receiptUrl}
                  className="h-80 w-full"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={payment.receiptUrl}
                  alt="Comprobante de pago"
                  className="h-80 w-full object-contain bg-background"
                />
              )
            ) : (
              <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
                Sin comprobante adjunto.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <article className="rounded-xl border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Datos
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Order</dt>
                <dd className="font-medium">{payment.orderId}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Subido por</dt>
                <dd className="font-medium">
                  {payment.payerEmail ?? payment.customerEmail}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Rechazos previos</dt>
                <dd className="font-medium">{payment.previousRejections}</dd>
              </div>
            </dl>
          </article>

          {payment.status === 'PENDING' ? (
            <article className="space-y-3 rounded-xl border bg-background p-4">
              <div>
                <h4 className="text-sm font-semibold">Revisión</h4>
                <p className="text-xs text-muted-foreground">
                  Aprobá directamente o dejá un comentario antes de rechazar.
                </p>
              </div>

              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Motivo del rechazo opcional"
                disabled={busy}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => onApprove(payment.id)}
                >
                  Aprobar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => onReject(payment.id, comment)}
                >
                  Rechazar
                </Button>
              </div>
            </article>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <article className="min-w-0 rounded-xl border bg-muted/20 p-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Monto
          </p>
          <p className="mt-1 break-words text-lg font-semibold leading-tight">
            {formatCurrencyFromCents(payment.amount, payment.currency)}
          </p>
        </article>
        <article className="min-w-0 rounded-xl border bg-muted/20 p-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Fecha de pago
          </p>
          <p className="mt-1 break-words text-lg font-semibold leading-tight">
            {(payment.paidAt ?? payment.createdAt).toLocaleDateString('es-AR')}
          </p>
        </article>
        {socialFeeAmount > 0 ? (
          <article className="min-w-0 rounded-xl border bg-muted/20 p-4 sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Cuota social
            </p>
            <p className="mt-1 text-lg font-semibold">
              {formatCurrencyFromCents(socialFeeAmount, payment.currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {socialFeeParticipants} participante
              {socialFeeParticipants === 1 ? '' : 's'}
            </p>
          </article>
        ) : null}

        {payment.activities.length > 0 ? (
          <article
            className={`min-w-0 rounded-xl border bg-muted/20 p-4 ${
              socialFeeAmount > 0 ? 'sm:col-span-2' : 'sm:col-span-4'
            }`}
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Actividades
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {payment.activities.map((activity) => (
                <li key={activity.id} className="space-y-0.5">
                  <div className="font-medium">{activity.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {activity.participantName}
                  </div>
                </li>
              ))}
            </ul>
          </article>
        ) : null}
      </div>

      {payment.accountantComments ? (
        <article className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">
            Último comentario
          </p>
          <p className="mt-2 text-sm text-amber-950">
            {payment.accountantComments}
          </p>
        </article>
      ) : null}

      <section className="space-y-3">
        <h4 className="text-sm font-semibold">Auditoría</h4>
        <AuditTrail entries={auditTrail} />
      </section>
    </section>
  );
}
