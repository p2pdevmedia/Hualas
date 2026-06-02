'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ACTIVITY_CART_STORAGE_KEY, ActivityCartItem } from '@/lib/cart';
import { formatAmount } from '@/lib/accounting';
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
    activityDayLabel?: string;
  }>;
  activityMonthlyPaymentLines: Array<{
    activityParticipantId: string;
    activityId: string;
    activityName: string;
    userId: string;
    childId: string | null;
    targetLabel: string;
    amount: number;
    periodMonth: number;
    periodYear: number;
    label: string;
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
    periodMonth: number;
    periodYear: number;
  }>;
  mercadoPagoFeeLines: Array<{
    amount: number;
    label: string;
  }>;
  totalActivityAmount: number;
  totalActivityMonthlyPaymentAmount: number;
  totalDiscountAmount: number;
  totalSocialFeeAmount: number;
  totalMercadoPagoFeeAmount: number;
  totalAmount: number;
  totalAmountWithMercadoPagoFee: number;
  socialFeeAmount: number;
  socialFeeMonths: number;
};

export default function ActivitiesCartPage() {
  const [items, setItems] = useState<ActivityCartItem[]>([]);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('MERCADO_PAGO');
  const [socialFeeMonths, setSocialFeeMonths] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [errorAction, setErrorAction] = useState<{
    label: string;
    url: string;
  } | null>(null);

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

    const controller = new AbortController();
    const fetchQuote = async () => {
      setQuoteLoading(true);
      setError(null);
      setErrorAction(null);
      try {
        const payload =
          items.length === 0
            ? { items: [], socialFeeOnly: true, socialFeeMonths }
            : { items };
        const response = await fetch('/api/activities/cart/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
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
          setErrorAction(null);
          return;
        }

        setQuote(data as QuoteResponse);
      } catch (fetchError) {
        if ((fetchError as { name?: string } | null)?.name === 'AbortError') {
          return;
        }
        setQuote(null);
        setError('No se pudo calcular el carrito.');
        setErrorAction(null);
      } finally {
        setQuoteLoading(false);
      }
    };

    fetchQuote();

    return () => controller.abort();
  }, [hydrated, items, socialFeeMonths]);

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
    setErrorAction(null);

    try {
      const payload =
        items.length === 0
          ? { items: [], socialFeeOnly: true, socialFeeMonths }
          : { items };
      const response = await fetch('/api/activities/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        redirectUrl?: string;
        actionUrl?: string;
        actionLabel?: string;
      };

      if (!response.ok) {
        setError(data?.error || 'No se pudo iniciar el pago.');
        if (data.actionUrl) {
          setErrorAction({
            label: data.actionLabel || 'Editar perfil',
            url: data.actionUrl,
          });
        }
        return;
      }

      if (data?.redirectUrl) {
        window.localStorage.removeItem(ACTIVITY_CART_STORAGE_KEY);
        window.location.href = data.redirectUrl;
      }
    } catch {
      setError('No se pudo iniciar el pago.');
      setErrorAction(null);
    } finally {
      setSubmitting(false);
    }
  };

  const canCheckout =
    !!quote && !quoteLoading && !submitting && quote.totalAmount > 0;
  const emptyCartTitle =
    items.length === 0 ? 'Pagos del mes' : 'Carrito de actividades';
  const manualItems = items.map((item) => ({
    activityId: item.activityId,
    target: item.target === 'self' ? 'self' : item.target,
    targetLabel: item.targetLabel,
    groupId: item.groupId,
    activityDayId: item.activityDayId,
    activityDayLabel: item.activityDayLabel,
  }));

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{emptyCartTitle}</h1>
        <p className="text-sm text-muted-foreground">
          {items.length === 0
            ? 'Pagá la cuota social y las actividades mensuales pendientes de tu grupo familiar.'
            : 'El total incluye automáticamente la cuota social si corresponde y aplica descuento familiar cuando hay dos hijos o más.'}
        </p>
      </header>

      {items.length === 0 ? (
        <div className="grid gap-6 py-8 lg:grid-cols-[1fr_420px] lg:items-start">
          <div className="rounded-xl border bg-muted/30 p-6 text-left">
            <h2 className="text-lg font-semibold">Pagos pendientes</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Este camino es para regularizar la cuota social y las actividades
              anuales que vuelven a pagarse este mes. Si después querés sumar
              una propuesta nueva, podés volver a la agenda y agregarla por
              separado.
            </p>
            <label className="mt-5 block space-y-2 text-sm">
              <span className="font-medium">Meses de cuota social a pagar</span>
              <select
                value={socialFeeMonths}
                onChange={(event) =>
                  setSocialFeeMonths(Number(event.target.value))
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map(
                  (months) => (
                    <option key={months} value={months}>
                      {months} {months === 1 ? 'mes' : 'meses'}
                    </option>
                  )
                )}
              </select>
              <span className="block text-xs text-muted-foreground">
                Podés adelantar cuotas sociales futuras. Las actividades
                pendientes se calculan para el mes actual.
              </span>
            </label>
            <Link
              href="/#actividades"
              className="mt-5 inline-flex h-9 items-center justify-center rounded-full border border-primary px-5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
            >
              Ver actividades
            </Link>
          </div>

          {quoteLoading ? (
            <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground shadow-sm">
              Buscando pagos pendientes...
            </p>
          ) : quote && quote.totalAmount > 0 ? (
            <section className="rounded-xl border bg-card p-5 text-left shadow-sm">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Resumen de pagos</h2>
                <p className="text-sm text-muted-foreground">
                  Tenés pagos pendientes para los conceptos listados abajo.
                </p>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {quote.activityMonthlyPaymentLines.map((line) => (
                  <div
                    key={`${line.activityParticipantId}:${line.periodYear}-${line.periodMonth}`}
                    className="flex items-center justify-between gap-4"
                  >
                    <span>{line.label}</span>
                    <span className="font-medium">
                      {formatAmount(line.amount)}
                    </span>
                  </div>
                ))}
                {quote.socialFeeLines.map((line, index) => (
                  <div
                    key={`${line.participant.userId}:${line.participant.childId ?? 'self'}:${index}`}
                    className="flex items-center justify-between gap-4"
                  >
                    <span>{line.label}</span>
                    <span className="font-medium">
                      {formatAmount(line.amount)}
                    </span>
                  </div>
                ))}
                {quote.mercadoPagoFeeLines.map((line, index) =>
                  paymentMethod === 'MERCADO_PAGO' ? (
                    <div
                      key={`empty-mp-fee-${index}`}
                      className="flex items-center justify-between gap-4 text-orange-700"
                    >
                      <span>{line.label}</span>
                      <span className="font-medium">
                        +{formatAmount(line.amount)}
                      </span>
                    </div>
                  ) : null
                )}
                <div className="border-t pt-4">
                  <PaymentMethodSelector
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                    disabled={quoteLoading || !quote}
                  />
                </div>
                <div className="border-t pt-2 flex items-center justify-between gap-4 text-base">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold">
                    {formatAmount(
                      paymentMethod === 'MERCADO_PAGO'
                        ? quote.totalAmountWithMercadoPagoFee
                        : quote.totalAmount
                    )}
                  </span>
                </div>
              </div>
              {paymentMethod === 'MERCADO_PAGO' ? (
                <Button
                  className="mt-4 w-full"
                  onClick={handleCheckout}
                  disabled={!canCheckout}
                >
                  {submitting ? 'Procesando...' : 'Pagar pendientes'}
                </Button>
              ) : (
                <ManualPaymentForm
                  endpoint="/api/activities/cart/checkout"
                  items={[]}
                  totalAmount={quote.totalAmount}
                  activitySummary="Vas a subir un comprobante para regularizar los pagos pendientes del mes."
                  socialFeeOnly
                  socialFeeMonths={socialFeeMonths}
                  embedded
                />
              )}
            </section>
          ) : (
            <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground shadow-sm">
              No hay pagos pendientes para este mes.
            </p>
          )}

          {error && (
            <div className="space-y-2 text-sm text-red-600 lg:col-span-2">
              <p>{error}</p>
              {errorAction && (
                <Link
                  href={`${errorAction.url}?returnTo=${encodeURIComponent('/activities/cart')}`}
                  className="inline-flex underline underline-offset-4 hover:text-red-700"
                >
                  {errorAction.label}
                </Link>
              )}
            </div>
          )}
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
                  {item.activityDayLabel && (
                    <p className="text-sm text-muted-foreground">
                      Sesión: {item.activityDayLabel}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">
                    {formatAmount(Number(item.price))}
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
                          {line.activityDayLabel
                            ? ` · ${line.activityDayLabel}`
                            : ''}
                        </span>
                        <span className="font-medium">
                          {formatAmount(line.amount)}
                        </span>
                      </div>
                    ))}
                    {quote.activityMonthlyPaymentLines.map((line) => (
                      <div
                        key={`${line.activityParticipantId}:${line.periodYear}-${line.periodMonth}`}
                        className="flex items-center justify-between gap-4"
                      >
                        <span>{line.label}</span>
                        <span className="font-medium">
                          {formatAmount(line.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Subtotal actividades</span>
                    <span className="font-medium">
                      {formatAmount(
                        quote.totalActivityAmount +
                          quote.totalActivityMonthlyPaymentAmount
                      )}
                    </span>
                  </div>
                  {quote.discountLines.map((line, index) => (
                    <div
                      key={`${line.label}-${index}`}
                      className="flex items-center justify-between gap-4 text-emerald-700"
                    >
                      <span>{line.label}</span>
                      <span className="font-medium">
                        -{formatAmount(line.amount)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-4">
                    <span>Cuotas sociales</span>
                    <span className="font-medium">
                      {formatAmount(quote.totalSocialFeeAmount)}
                    </span>
                  </div>
                  {paymentMethod === 'MERCADO_PAGO' &&
                    quote.mercadoPagoFeeLines.map((line, index) => (
                      <div
                        key={`mp-fee-${index}`}
                        className="flex items-center justify-between gap-4 text-orange-700"
                      >
                        <span>{line.label}</span>
                        <span className="font-medium">
                          +{formatAmount(line.amount)}
                        </span>
                      </div>
                    ))}
                  <div className="border-t pt-2 flex items-center justify-between gap-4 text-base">
                    <span className="font-semibold">Total</span>
                    <span className="font-semibold">
                      {formatAmount(
                        paymentMethod === 'MERCADO_PAGO'
                          ? quote.totalAmountWithMercadoPagoFee
                          : quote.totalAmount
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No se pudo calcular el carrito.
                </p>
              )}
            </div>

            <div className="space-y-5">
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Pagos del mes</h2>
                {quoteLoading ? null : quote?.activityMonthlyPaymentLines
                    .length ? (
                  <ul className="space-y-2 text-sm">
                    {quote.activityMonthlyPaymentLines.map((line) => (
                      <li
                        key={`${line.activityParticipantId}:${line.periodYear}-${line.periodMonth}`}
                        className="rounded-md border bg-muted/20 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{line.activityName}</p>
                            <p className="text-muted-foreground">
                              {line.targetLabel} - {line.periodMonth}/
                              {line.periodYear}
                            </p>
                          </div>
                          <span className="font-semibold">
                            {formatAmount(line.amount)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No hay actividades mensuales pendientes para este mes.
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
                            {formatAmount(line.amount)}
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
                {quote
                  ? formatAmount(
                      paymentMethod === 'MERCADO_PAGO'
                        ? quote.totalAmountWithMercadoPagoFee
                        : quote.totalAmount
                    )
                  : 'Calculando...'}
              </p>
              <p className="text-sm text-muted-foreground">
                {paymentMethod === 'MERCADO_PAGO'
                  ? 'Incluye 10% de cargos de servicios externos Mercado Libre.'
                  : 'El importe visible coincide con el comprobante de transferencia.'}
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

          {error && (
            <div className="space-y-2 text-sm text-red-600">
              <p>{error}</p>
              {errorAction && (
                <Link
                  href={`${errorAction.url}?returnTo=${encodeURIComponent('/activities/cart')}`}
                  className="inline-flex underline underline-offset-4 hover:text-red-700"
                >
                  {errorAction.label}
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
