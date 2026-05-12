'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
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
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [error, setError] = useState('');

  if (registrations.length === 0) {
    return null;
  }

  async function withdraw(participantId: string) {
    const note = notes[participantId]?.trim() ?? '';
    const rating = ratings[participantId] ?? 0;

    if (note.length < 50) {
      setError('La nota debe tener al menos 50 caracteres.');
      return;
    }

    setError('');
    setSubmittingId(participantId);

    try {
      const response = await fetch(`/api/activities/${activityId}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, note, rating }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo registrar la baja');
      }

      setConfirmingId(null);
      setFeedbackId(null);
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
          const isWritingFeedback = feedbackId === registration.id;
          const isSubmitting = submittingId === registration.id;
          const note = notes[registration.id] ?? '';
          const rating = ratings[registration.id] ?? 0;
          const noteCharacters = note.trim().length;

          return (
            <div
              key={registration.id}
              className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {registration.label}
                </p>
                {isConfirming && !isWritingFeedback && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Confirmá la baja para esta inscripción.
                  </p>
                )}
              </div>

              {isWritingFeedback ? (
                <div className="space-y-4 sm:min-w-[26rem]">
                  <div>
                    <label
                      htmlFor={`withdrawal-note-${registration.id}`}
                      className="text-sm font-medium text-foreground"
                    >
                      Contanos el motivo de la baja
                    </label>
                    <textarea
                      id={`withdrawal-note-${registration.id}`}
                      value={note}
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [registration.id]: event.target.value,
                        }))
                      }
                      rows={4}
                      minLength={50}
                      className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                      placeholder="Escribí una nota de al menos 50 caracteres."
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {noteCharacters}/50 caracteres mínimos
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Valoración de la actividad
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {Array.from({ length: 6 }, (_, value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setRatings((current) => ({
                              ...current,
                              [registration.id]: value,
                            }))
                          }
                          className={`inline-flex h-9 items-center gap-1 rounded-full border px-3 text-sm transition-colors ${
                            rating === value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:bg-muted'
                          }`}
                          aria-label={`Valorar con ${value} estrellas`}
                        >
                          {value}
                          <Star
                            className="h-4 w-4"
                            fill={
                              value > 0 && rating === value
                                ? 'currentColor'
                                : 'none'
                            }
                            aria-hidden="true"
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => withdraw(registration.id)}
                      disabled={isSubmitting || noteCharacters < 50}
                    >
                      {isSubmitting ? 'Procesando...' : 'Enviar baja'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFeedbackId(null);
                        setConfirmingId(null);
                        setError('');
                      }}
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : isConfirming ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setFeedbackId(registration.id);
                      setError('');
                    }}
                  >
                    Confirmar baja
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setConfirmingId(null);
                      setError('');
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setConfirmingId(registration.id);
                    setFeedbackId(null);
                    setError('');
                  }}
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
