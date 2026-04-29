'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';

function formatMoneyInput(value: number) {
  return Number.isFinite(value) ? String(value) : '0';
}

export default function SocialFeeSettingsForm({
  initialAmount,
}: {
  initialAmount: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(formatMoneyInput(initialAmount));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const parsedAmount = Number(amount);
    if (!Number.isInteger(parsedAmount) || parsedAmount < 0) {
      setError('Ingresá un monto válido en pesos.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/accounting/social-fee', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: parsedAmount }),
      });

      const data = (await response.json().catch(() => ({}))) as
        | { error?: string }
        | Record<string, unknown>;

      if (!response.ok) {
        setError(
          typeof data.error === 'string'
            ? data.error
            : 'No se pudo actualizar la cuota social.'
        );
        return;
      }

      setAmount(String(parsedAmount));
      setSuccess('Cuota social actualizada.');
      router.refresh();
    } catch {
      setError('No se pudo actualizar la cuota social.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label
          className="block text-sm font-medium"
          htmlFor="social-fee-amount"
        >
          Monto mensual
        </label>
        <input
          id="social-fee-amount"
          name="amount"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground">
          Se guarda como valor entero en pesos y se usa en los próximos cobros.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Guardando...' : 'Guardar monto'}
        </button>
        {success ? (
          <p className="text-sm font-medium text-emerald-600">{success}</p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
