'use client';

import { useEffect, useState } from 'react';
import { enqueueMutation } from '@/lib/offline/pending-mutations';

type AttendanceStatus = 'PENDING' | 'GOING' | 'NOT_GOING';

type Participant = {
  activityParticipantId: string;
  participantName: string;
  status: AttendanceStatus;
};

interface AttendanceManagerProps {
  dayId: string;
  participants: Participant[];
}

const statusLabels: Record<AttendanceStatus, string> = {
  PENDING: 'Sin confirmar',
  GOING: 'Asistió',
  NOT_GOING: 'No asistió',
};

const activeClass: Record<AttendanceStatus, string> = {
  PENDING: 'border-border bg-muted text-foreground',
  GOING: 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400',
  NOT_GOING: 'border-destructive bg-destructive/10 text-destructive',
};

export default function AttendanceManager({
  dayId,
  participants: initial,
}: AttendanceManagerProps) {
  const [list, setList] = useState(initial);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const onSynced = () => setPendingIds(new Set());
    window.addEventListener('hualas-mutations-synced', onSynced);
    return () => window.removeEventListener('hualas-mutations-synced', onSynced);
  }, []);

  async function update(participantId: string, status: AttendanceStatus) {
    const previous = list;
    setList((current) =>
      current.map((p) =>
        p.activityParticipantId === participantId ? { ...p, status } : p,
      ),
    );
    setSavingId(participantId);
    setError('');

    if (!navigator.onLine) {
      await enqueueMutation({
        url: `/api/activity-days/${dayId}/attendance`,
        method: 'PATCH',
        body: { participantId, status },
      });
      setPendingIds((prev) => new Set([...prev, participantId]));
      setSavingId(null);
      return;
    }

    try {
      const res = await fetch(`/api/activity-days/${dayId}/attendance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, status }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo actualizar');
      }
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(participantId);
        return next;
      });
    } catch (err) {
      if (!navigator.onLine) {
        await enqueueMutation({
          url: `/api/activity-days/${dayId}/attendance`,
          method: 'PATCH',
          body: { participantId, status },
        });
        setPendingIds((prev) => new Set([...prev, participantId]));
      } else {
        setList(previous);
        setError(err instanceof Error ? err.message : 'No se pudo actualizar');
      }
    } finally {
      setSavingId(null);
    }
  }

  const going = list.filter((p) => p.status === 'GOING').length;
  const notGoing = list.filter((p) => p.status === 'NOT_GOING').length;
  const pending = list.filter((p) => p.status === 'PENDING').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-b pb-3">
        <span className="font-medium text-green-700 dark:text-green-400">
          {going} asistieron
        </span>
        <span className="font-medium text-destructive">
          {notGoing} no asistieron
        </span>
        <span>{pending} sin confirmar</span>
        {pendingIds.size > 0 && (
          <span className="font-medium text-amber-600 dark:text-amber-400">
            {pendingIds.size} sin sincronizar
          </span>
        )}
      </div>

      <div className="space-y-2">
        {list.map((entry) => {
          const isSaving = savingId === entry.activityParticipantId;
          const isPending = pendingIds.has(entry.activityParticipantId);
          return (
            <div
              key={entry.activityParticipantId}
              className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3"
            >
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <p className="text-sm font-medium truncate">
                  {entry.participantName}
                </p>
                {isPending && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    pendiente
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {(['GOING', 'NOT_GOING', 'PENDING'] as AttendanceStatus[]).map(
                  (status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={isSaving}
                      onClick={() =>
                        update(entry.activityParticipantId, status)
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        entry.status === status
                          ? activeClass[status]
                          : 'border-border bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {statusLabels[status]}
                    </button>
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
