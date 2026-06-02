'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  MANUAL_PAYMENT_BANK_DETAILS,
  validateManualPaymentFile,
} from '@/lib/manual-payment-ui';
import { formatAmount } from '@/lib/accounting';

type ManualPaymentFormProps = {
  endpoint: string;
  items: Array<{
    activityId: string;
    target?: string;
    targetLabel?: string;
    groupId?: string;
    activityDayId?: string;
    activityDayLabel?: string;
  }>;
  totalAmount: number;
  activitySummary?: string;
  childId?: string | null;
  socialFeeOnly?: boolean;
  socialFeeMonths?: number;
  embedded?: boolean;
};

const MANUAL_PAYMENT_BANK_COPY_TEXT = [
  'Transferencia bancaria manual',
  `Banco: ${MANUAL_PAYMENT_BANK_DETAILS.bankName}`,
  `CBU: ${MANUAL_PAYMENT_BANK_DETAILS.cbu}`,
  `Alias: ${MANUAL_PAYMENT_BANK_DETAILS.alias}`,
  `Cuenta: ${MANUAL_PAYMENT_BANK_DETAILS.account}`,
  `CUIT/CUIL: ${MANUAL_PAYMENT_BANK_DETAILS.cuit}`,
  `Concepto: ${MANUAL_PAYMENT_BANK_DETAILS.concept}`,
].join('\n');

type CopyTarget = 'all' | 'cbu' | 'alias' | null;

export default function ManualPaymentForm({
  endpoint,
  items,
  totalAmount,
  activitySummary,
  childId,
  socialFeeOnly = false,
  socialFeeMonths = 1,
  embedded = false,
}: ManualPaymentFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copyTarget, setCopyTarget] = useState<CopyTarget>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);

  const preview = useMemo(
    () =>
      file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : '',
    [file]
  );

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const updateCopyTarget = (nextTarget: CopyTarget) => {
    setCopyTarget(nextTarget);
    if (copyTimeoutRef.current) {
      window.clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = window.setTimeout(() => {
      setCopyTarget(null);
    }, 1800);
  };

  const copyToClipboard = async (text: string, target: CopyTarget) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopyError(null);
      updateCopyTarget(target);
    } catch {
      setCopyError('No se pudo copiar el dato bancario.');
    }
  };

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
      if (socialFeeOnly) {
        formData.append('socialFeeOnly', 'true');
        formData.append('socialFeeMonths', String(socialFeeMonths));
      }
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
        socialFeeOnly
          ? 'Pago enviado. Tu comprobante quedó pendiente de revisión.'
          : 'Pago enviado. Tu inscripción quedó registrada y el comprobante quedó pendiente de revisión.'
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
      className={
        embedded
          ? 'space-y-5 border-t pt-5'
          : 'space-y-5 rounded-2xl border bg-card p-5 shadow-sm'
      }
    >
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Transferencia manual</h3>
        <p className="text-sm text-muted-foreground">
          {socialFeeOnly
            ? 'Subí el comprobante y dejamos los pagos pendientes en revisión.'
            : 'Subí el comprobante y dejamos la inscripción registrada al instante.'}
        </p>
      </div>

      <section className="space-y-4 rounded-xl border bg-muted/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Datos bancarios</h4>
            <p className="text-xs text-muted-foreground">
              Copiá el CBU o el alias por separado, o llevate todos los datos
              juntos para transferir desde el celular.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() =>
              copyToClipboard(MANUAL_PAYMENT_BANK_COPY_TEXT, 'all')
            }
          >
            <Copy className="mr-2 h-4 w-4" />
            {copyTarget === 'all' ? 'Datos copiados' : 'Copiar datos bancarios'}
          </Button>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <BankDetail
            label="Banco"
            value={MANUAL_PAYMENT_BANK_DETAILS.bankName}
          />
          <BankDetail
            label="Cuenta"
            value={MANUAL_PAYMENT_BANK_DETAILS.account}
          />
          <CopyableBankDetail
            label="CBU"
            value={MANUAL_PAYMENT_BANK_DETAILS.cbu}
            onCopy={() =>
              copyToClipboard(MANUAL_PAYMENT_BANK_DETAILS.cbu, 'cbu')
            }
            copied={copyTarget === 'cbu'}
          />
          <CopyableBankDetail
            label="Alias"
            value={MANUAL_PAYMENT_BANK_DETAILS.alias}
            onCopy={() =>
              copyToClipboard(MANUAL_PAYMENT_BANK_DETAILS.alias, 'alias')
            }
            copied={copyTarget === 'alias'}
          />
          <BankDetail
            label="CUIT/CUIL"
            value={MANUAL_PAYMENT_BANK_DETAILS.cuit}
          />
          <BankDetail
            label="Concepto sugerido"
            value={MANUAL_PAYMENT_BANK_DETAILS.concept}
            className="sm:col-span-2"
          />
        </dl>

        {copyError ? (
          <p className="text-xs text-destructive">{copyError}</p>
        ) : null}
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
            {socialFeeOnly
              ? 'Se registra el total pendiente del mes.'
              : 'Se registra el total del checkout con la cuota social incluida, si corresponde.'}
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

function BankDetail({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border bg-background p-3 ${className}`.trim()}>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-all text-sm font-medium text-foreground">
        {value}
      </dd>
    </div>
  );
}

function CopyableBankDetail({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </dt>
          <dd className="mt-1 break-all font-mono text-sm text-foreground">
            {value}
          </dd>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 px-3 text-xs"
          onClick={onCopy}
        >
          <Copy className="mr-2 h-3.5 w-3.5" />
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
    </div>
  );
}
