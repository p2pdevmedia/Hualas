'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ACTIVITY_CART_STORAGE_KEY, ActivityCartItem } from '@/lib/cart';
import PaymentMethodSelector, {
  type PaymentMethod,
} from '@/components/checkout/payment-method-selector';
import ManualPaymentForm from '@/components/checkout/manual-payment-form';

type QuoteResponse = {
  activityLines: Array<{
    id: string;
    name: string;
    amount: number;
    targetLabel: string;
  }>;
  discountLines: Array<{
    amount: number;
    label: string;
  }>;
  socialFeeLines: Array<{
    participant: {
      userId: string;
      childId: string | null;
    };
    amount: number;
    label: string;
  }>;
  totalActivityAmount: number;
  totalDiscountAmount: number;
  totalSocialFeeAmount: number;
  totalAmount: number;
  socialFeeAmount: number;
};

function formatMoney(amount: number) {
  return `$${Number(amount).toLocaleString('es-AR')}`;
}

export default function ActivitiesCartPage() {
  const [items, setItems] = useState<ActivityCartItem[]>([]);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('MERCADO_PAGO');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(ACTIVITY_CART_STORAGE_KEY);
    if (!raw) {
      setItems([]);
      setHydrated(true);
      return;
    }

    try {
      setItems(JSON.parse(raw) as ActivityCartItem[]);
    } catch {
      window.localStorage.removeItem(ACTIVITY_CART_STORAGE_KEY);
      setItems([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (items.length === 0) {
      setQuote(null);
      setError(null);
      setQuoteLoading(false);
      return;
    }

    const controller = new AbortController();
    const fetchQuote = async () => {
      setQuoteLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/activities/cart/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => ({}))) as
          | QuoteResponse
          | { error?: string };

        if (!response.ok) {
          const message =
            'error' in data && typeof data.error === 'string'
              ? data.error
              : 'No se pudo calcular el carrito.';
          setQuote(null);
          setError(message);
          return;
        }

        setQuote(data as QuoteResponse);
      } catch (fetchError) {
        if ((fetchError as { name?: string } | null)?.name === 'AbortError') {
          return;
        }
        setQuote(null);
        setError('No se pudo calcular el carrito.');
      } finally {
        setQuoteLoading(false);
      }
    };

    fetchQuote();

    return () => controller.abort();
  }, [hydrated, items]);


  const persist = (next: ActivityCartItem[]) => {
    setItems(next);
    window.localStorage.setItem(
      ACTIVITY_CART_STORAGE_KEY,
      JSON.stringify(next)
    );
  };

  const handleCheckout = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/activities/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        redirectUrl?: string;
      };

      if (!response.ok) {
        setError(data?.error || 'No se pudo iniciar el pago.');
        return;
      }

      if (data?.redirectUrl) {
        window.localStorage.removeItem(ACTIVITY_CART_STORAGE_KEY);
        window.location.href = data.redirectUrl;
      }
    } catch {
      setError('No se pudo iniciar el pago.');
    } finally {
      setSubmitting(false);
    }
  };

  const canCheckout = !!quote && !quoteLoading && !submitting;
  const manualItems = items.map((item) => ({
    activityId: item.activityId,
    target: item.target === 'self' ? 'self' : item.target,
    targetLabel: item.targetLabel,
  }));

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Carrito de actividades</h1>
        <p className="text-sm text-muted-foreground">
          El total incluye automáticamente la cuota social si corresponde y
          aplica descuento familiar cuando hay dos hijos o más.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-muted-foreground">No hay actividades en el carrito.</p>
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Buscar actividades
          </Link>
        </div>
      ) : (
        <>
          <section className="space-y-3">
            {items.map((item, index) => (
              <article
                key={`${item.activityId}-${item.target}-${index}`}
                className="rounded-md border p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{item.activityName}</p>
                  <p className="text-sm text-muted-foreground">
                    Inscripción: {item.targetLabel}
                  </p>
                  {item.groupName && (
                    <p className="text-sm text-muted-foreground">
                      Grupo: {item.groupName}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">
                    {formatMoney(Number(item.price))}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => persist(items.filter((_, i) => i !== index))}
                  >
                    Quitar
                  </Button>
                </div>
              </article>
            ))}
          </section>

          <div>
            <Link
              href="/"
              className="inline-flex h-9 items-center justify-center rounded-full border border-primary px-4 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
            >
              ← Seguir agregando actividades
            </Link>
          </div>

          <section className="grid gap-4 rounded-xl border bg-card p-5 shadow-sm md:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Resumen</h2>
              {quoteLoading ? (
                <p className="text-sm text-muted-foreground">
                  Calculando total final...
                </p>
              ) : quote ? (
                <div className="space-y-2 text-sm">
                  <div className="space-y-1">
                    {quote.activityLines.map((line, index) => (
                      <div
                        key={`${line.id}-${index}`}
                        className="flex items-center justify-between gap-4"
                      >
                        <span>
                          {line.name} · {line.targetLabel}
                        </span>
                        <span className="font-medium">
                          {formatMoney(line.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Subtotal actividades</span>
                    <span className="font-medium">
                      {formatMoney(quote.totalActivityAmount)}
                    </span>
                  </div>
                  {quote.discountLines.map((line, index) => (
                    <div
                      key={`${line.label}-${index}`}
                      className="flex items-center justify-between gap-4 text-emerald-700"
                    >
                      <span>{line.label}</span>
                      <span className="font-medium">
                        -{formatMoney(line.amount)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-4">
                    <span>Cuotas sociales</span>
                    <span className="font-medium">
                      {formatMoney(quote.totalSocialFeeAmount)}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex items-center justify-between gap-4 text-base">
                    <span className="font-semibold">Total</span>
                    <span className="font-semibold">
                      {formatMoney(quote.totalAmount)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No se pudo calcular el carrito.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Cuota social</h2>
              {quoteLoading ? null : quote?.socialFeeLines.length ? (
                <ul className="space-y-2 text-sm">
                  {quote.socialFeeLines.map((line, index) => (
                    <li
                      key={`${line.participant.userId}:${line.participant.childId ?? 'self'}:${index}`}
                      className="rounded-md border bg-muted/20 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{line.label}</p>
                          <p className="text-muted-foreground">
                            {line.participant.childId
                              ? 'Se suma por el hijo inscripto.'
                              : 'Se suma por el titular inscripto.'}
                          </p>
                        </div>
                        <span className="font-semibold">
                          {formatMoney(line.amount)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No corresponde agregar cuota social para este carrito.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <PaymentMethodSelector
              value={paymentMethod}
              onChange={setPaymentMethod}
              disabled={quoteLoading || !quote}
            />
          </section>

          {paymentMethod === 'MANUAL_TRANSFER' && quote ? (
            <ManualPaymentForm
              endpoint="/api/activities/cart/checkout"
              items={manualItems}
              totalAmount={quote.totalAmount}
              activitySummary={`Vas a subir un comprobante para ${items.length} actividad${items.length === 1 ? '' : 'es'}.`}
            />
          ) : null}

          <div className="border-t pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold">
                Total a pagar:{' '}
                {quote ? formatMoney(quote.totalAmount) : 'Calculando...'}
              </p>
              <p className="text-sm text-muted-foreground">
                El importe visible coincide con el checkout de Mercado Pago.
              </p>
            </div>
            {paymentMethod === 'MERCADO_PAGO' ? (
              <Button onClick={handleCheckout} disabled={!canCheckout}>
                {submitting ? 'Procesando...' : 'Pagar carrito'}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                El envío del comprobante se hace arriba.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </>
      )}
    </main>
  );
}
