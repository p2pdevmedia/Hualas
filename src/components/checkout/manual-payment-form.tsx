'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  MANUAL_PAYMENT_INSTRUCTIONS,
  validateManualPaymentFile,
} from '@/lib/manual-payment-ui';

type ManualPaymentFormProps = {
  endpoint: string;
  items: Array<{
    activityId: string;
    target?: string;
    targetLabel?: string;
  }>;
  totalAmount: number;
  activitySummary?: string;
  childId?: string | null;
};

function formatAmount(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ManualPaymentForm({
  endpoint,
  items,
  totalAmount,
  activitySummary,
  childId,
}: ManualPaymentFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const preview = useMemo(
    () =>
      file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : '',
    [file]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!file) {
      setError('Elegí un comprobante para continuar.');
      return;
    }

    const validationError = validateManualPaymentFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('paymentMethod', 'MANUAL_TRANSFER');
      formData.append('items', JSON.stringify(items));
      formData.append('proof', file);
      if (childId) {
        formData.append('childId', childId);
      }
      if (note.trim()) {
        formData.append('note', note.trim());
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        redirectUrl?: string;
      };

      if (!response.ok) {
        throw new Error(body.error || 'No se pudo registrar el pago manual.');
      }

      setSuccess(
        'Pago enviado. Tu inscripción quedó registrada y el comprobante quedó pendiente de revisión.'
      );
      setFile(null);
      setNote('');
      if (body.redirectUrl) {
        window.localStorage?.removeItem('hualas-activity-cart');
        router.push(body.redirectUrl);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo registrar el pago manual.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm"
    >
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Transferencia manual</h3>
        <p className="text-sm text-muted-foreground">
          Subí el comprobante y dejamos la inscripción registrada al instante.
        </p>
      </div>

      <section className="rounded-xl border bg-muted/20 p-4 text-sm">
        <pre className="whitespace-pre-wrap font-sans text-foreground">
          {MANUAL_PAYMENT_INSTRUCTIONS}
        </pre>
      </section>

      {activitySummary ? (
        <p className="text-sm text-muted-foreground">{activitySummary}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium">Comprobante</span>
          <Input
            type="file"
            accept="image/png,image/jpeg,application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            disabled={submitting}
          />
          {preview ? (
            <p className="text-xs text-muted-foreground">{preview}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              PNG, JPG o PDF. Máximo 5 MB.
            </p>
          )}
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium">Monto total</span>
          <Input value={formatAmount(totalAmount)} readOnly />
          <p className="text-xs text-muted-foreground">
            Se registra el total del checkout con la cuota social incluida, si
            corresponde.
          </p>
        </label>
      </div>

      <label className="space-y-2 text-sm">
        <span className="font-medium">Comentario opcional</span>
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Agregá una referencia o aclaración si hace falta."
          disabled={submitting}
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Enviando...' : 'Enviar comprobante'}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-success">{success}</p> : null}
    </form>
  );
}
