'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

type Payment = {
  id: string;
  periodMonth: number;
  periodYear: number;
  amount: number;
  status: string;
  paidAt: string | null;
  notes: string | null;
};

type ProfessorProfile = {
  monthlySalary: number;
  bankName: string | null;
  cbu: string | null;
  alias: string | null;
  cuit: string | null;
  notes: string | null;
  payments: Payment[];
};

type Props = {
  professorId: string;
  initialProfile: ProfessorProfile | null;
};

type Tab = 'history' | 'banking';

export default function MyPaymentsClient({
  professorId,
  initialProfile,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [profile, setProfile] = useState(initialProfile);
  const [bankName, setBankName] = useState(initialProfile?.bankName ?? '');
  const [cbu, setCbu] = useState(initialProfile?.cbu ?? '');
  const [alias, setAlias] = useState(initialProfile?.alias ?? '');
  const [cuit, setCuit] = useState(initialProfile?.cuit ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const payments = profile?.payments ?? [];

  const saveBankingData = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/professors/${professorId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName: bankName.trim() || null,
          cbu: cbu.trim() || null,
          alias: alias.trim() || null,
          cuit: cuit.trim() || null,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? 'No se pudo guardar');

      setProfile((current) => ({
        monthlySalary:
          current?.monthlySalary ?? body.profile.monthlySalary ?? 0,
        notes: current?.notes ?? body.profile.notes ?? null,
        payments: current?.payments ?? [],
        bankName: body.profile.bankName,
        cbu: body.profile.cbu,
        alias: body.profile.alias,
        cuit: body.profile.cuit,
      }));
      setSuccess(
        'Tus datos bancarios fueron guardados. Contaduría ya puede verlos en tu perfil.'
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <div
        className="flex flex-wrap gap-2 rounded-full border bg-muted/20 p-1"
        role="tablist"
        aria-label="Secciones de mis pagos"
      >
        <TabButton
          active={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
        >
          Historial de pagos
        </TabButton>
        <TabButton
          active={activeTab === 'banking'}
          onClick={() => setActiveTab('banking')}
        >
          Mis datos bancarios
        </TabButton>
      </div>

      {activeTab === 'history' ? (
        <div className="space-y-6" role="tabpanel">
          {!profile ? (
            <div className="rounded-xl border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              Todavía no tenés datos de pago cargados. Abrí la pestaña{' '}
              <button
                type="button"
                onClick={() => setActiveTab('banking')}
                className="font-medium text-primary hover:underline"
              >
                Mis datos bancarios
              </button>{' '}
              para completarlos y compartirlos automáticamente con contaduría.
            </div>
          ) : (
            <BankingSummary profile={profile} />
          )}

          <PaymentHistory payments={payments} />
        </div>
      ) : (
        <section className="rounded-xl border p-6 space-y-4" role="tabpanel">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Mis datos bancarios</h2>
            <p className="text-sm text-muted-foreground">
              Completá o actualizá tus datos de transferencia. Se guardan en el
              mismo perfil que usa contaduría para pagarte.
            </p>
          </div>

          <form onSubmit={saveBankingData} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Banco</span>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Ej: Banco Nación"
                  maxLength={100}
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium">CBU</span>
                <Input
                  value={cbu}
                  onChange={(e) => setCbu(e.target.value)}
                  className="font-mono"
                  placeholder="22 dígitos"
                  maxLength={22}
                  inputMode="numeric"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Alias</span>
                <Input
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  className="font-mono"
                  placeholder="mi.alias.mp"
                  maxLength={50}
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium">CUIT/CUIL</span>
                <Input
                  value={cuit}
                  onChange={(e) => setCuit(e.target.value)}
                  className="font-mono"
                  placeholder="20-12345678-9"
                  maxLength={13}
                />
              </label>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}

            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar mis datos bancarios'}
            </Button>
          </form>
        </section>
      )}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function BankingSummary({ profile }: { profile: ProfessorProfile }) {
  return (
    <section className="rounded-xl border p-6 space-y-4">
      <h2 className="text-lg font-semibold">Datos bancarios</h2>
      <dl className="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            Sueldo mensual
          </dt>
          <dd className="mt-0.5 font-mono font-semibold text-base">
            {formatAmount(profile.monthlySalary)}
          </dd>
        </div>
        <SummaryItem label="Banco" value={profile.bankName} />
        <SummaryItem label="CBU" value={profile.cbu} mono />
        <SummaryItem label="Alias" value={profile.alias} mono />
        <SummaryItem label="CUIT/CUIL" value={profile.cuit} mono />
      </dl>
      {profile.notes && (
        <p className="text-xs text-muted-foreground border-t pt-3">
          {profile.notes}
        </p>
      )}
    </section>
  );
}

function SummaryItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  if (!value) return null;

  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className={`mt-0.5 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}

function PaymentHistory({ payments }: { payments: Payment[] }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Historial de pagos</h2>
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Período</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Fecha pago</th>
                <th className="px-4 py-3 text-left">Notas</th>
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
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {payment.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING: {
      label: 'Pendiente',
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    },
    PAID: {
      label: 'Pagado',
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
