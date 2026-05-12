'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Registration = {
  id: string;
  label: string;
};

type ActivityWithdrawalPanelProps = {
  activityId: string;
  registrations: Registration[];
};

export default function ActivityWithdrawalPanel({
  activityId,
  registrations,
}: ActivityWithdrawalPanelProps) {
  const router = useRouter();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (registrations.length === 0) {
    return null;
  }

  async function withdraw(participantId: string) {
    setError('');
    setSubmittingId(participantId);

    try {
      const response = await fetch(`/api/activities/${activityId}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo registrar la baja');
      }

      setConfirmingId(null);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo registrar la baja'
      );
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <section className="mt-10 border-t pt-6">
      <div className="space-y-2">
        <h2 className="font-heading text-xl font-semibold">
          Baja de la actividad
        </h2>
        <p className="text-sm text-muted-foreground font-body">
          La baja conserva los pagos ya registrados y evita que esta inscripción
          siga figurando para cobros de meses próximos.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {registrations.map((registration) => {
          const isConfirming = confirmingId === registration.id;
          const isSubmitting = submittingId === registration.id;

          return (
            <div
              key={registration.id}
              className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {registration.label}
                </p>
                {isConfirming && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Confirmá la baja para esta inscripción.
                  </p>
                )}
              </div>

              {isConfirming ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => withdraw(registration.id)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Procesando...' : 'Confirmar baja'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmingId(null)}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmingId(registration.id)}
                  disabled={Boolean(submittingId)}
                >
                  Desinscribirme
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
