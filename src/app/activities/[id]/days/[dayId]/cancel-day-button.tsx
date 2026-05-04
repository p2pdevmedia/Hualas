'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface Props {
  dayId: string;
  activityId: string;
  initialCancelled: boolean;
  initialReason: string | null;
}

export default function CancelDayButton({
  dayId,
  activityId,
  initialCancelled,
  initialReason,
}: Props) {
  const router = useRouter();
  const [cancelled, setCancelled] = useState(initialCancelled);
  const [reason, setReason] = useState(initialReason ?? '');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmingReactivate, setConfirmingReactivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    if (!reason.trim()) {
      setError('El motivo de cancelación es obligatorio.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/activity-days/${dayId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelled: true, cancellationReason: reason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al cancelar el día');
      }
      setCancelled(true);
      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar el día');
    } finally {
      setLoading(false);
    }
  }

  async function handleReactivate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/activity-days/${dayId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelled: false }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al reactivar el día');
      }
      setCancelled(false);
      setReason('');
      setConfirmingReactivate(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reactivar el día');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {!cancelled && !dialogOpen && (
        <Button
          variant="destructive"
          onClick={() => {
            setError(null);
            setDialogOpen(true);
          }}
        >
          Cancelar este día
        </Button>
      )}

      {!cancelled && dialogOpen && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 space-y-3">
          <p className="text-sm font-medium text-destructive">Cancelar este día</p>
          <textarea
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-destructive/40"
            rows={3}
            placeholder="Motivo de cancelación (obligatorio)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={loading}
            >
              {loading ? 'Cancelando...' : 'Confirmar cancelación'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDialogOpen(false);
                setError(null);
              }}
              disabled={loading}
            >
              Volver
            </Button>
          </div>
        </div>
      )}

      {cancelled && !confirmingReactivate && (
        <Button
          variant="outline"
          onClick={() => {
            setError(null);
            setConfirmingReactivate(true);
          }}
        >
          Reactivar día
        </Button>
      )}

      {cancelled && confirmingReactivate && (
        <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
          <p className="text-sm font-medium">¿Reactivar este día?</p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleReactivate}
              disabled={loading}
            >
              {loading ? 'Reactivando...' : 'Sí, reactivar'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmingReactivate(false);
                setError(null);
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
