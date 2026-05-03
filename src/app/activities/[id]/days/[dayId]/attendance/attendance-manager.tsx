'use client';

import { useState } from 'react';

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

  async function update(participantId: string, status: AttendanceStatus) {
    setSavingId(participantId);
    setError('');
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
      setList((prev) =>
        prev.map((p) =>
          p.activityParticipantId === participantId ? { ...p, status } : p
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar');
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
        <span className="font-medium text-destructive">{notGoing} no asistieron</span>
        <span>{pending} sin confirmar</span>
      </div>

      <div className="space-y-2">
        {list.map((entry) => {
          const isSaving = savingId === entry.activityParticipantId;
          return (
            <div
              key={entry.activityParticipantId}
              className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3"
            >
              <p className="flex-1 text-sm font-medium">
                {entry.participantName}
              </p>
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
                  )
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
