'use client';

export type PaymentMethod = 'MERCADO_PAGO' | 'MANUAL_TRANSFER';

type PaymentMethodSelectorProps = {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  disabled?: boolean;
};

const options: Array<{
  value: PaymentMethod;
  label: string;
  description: string;
}> = [
  {
    value: 'MERCADO_PAGO',
    label: 'Mercado Pago',
    description: 'Pago online con tarjeta, saldo o transferencia desde MP.',
  },
  {
    value: 'MANUAL_TRANSFER',
    label: 'Transferencia manual',
    description: 'Subís el comprobante y el pago queda pendiente de revisión.',
  },
];

export default function PaymentMethodSelector({
  value,
  onChange,
  disabled,
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Método de pago</h3>
        <p className="text-sm text-muted-foreground">
          Elegí cómo querés completar la inscripción.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                active
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-background hover:bg-muted/40'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{option.label}</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                    active
                      ? 'border-primary text-primary'
                      : 'border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  {active ? 'Seleccionado' : 'Opcional'}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
      {value === 'MERCADO_PAGO' ? (
        <p className="text-xs text-muted-foreground">
          Vas a ser redirigido al checkout seguro de Mercado Pago.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          El comprobante debe ser PNG, JPG o PDF y pesar menos de 5 MB.
        </p>
      )}
    </div>
  );
}
