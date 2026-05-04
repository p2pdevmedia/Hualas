'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Group = { id: string; name: string };

type InscriptosParticipant = {
  id: string;
  name: string;
  subtitle: string;
  receipt?: string | null;
  receiptDate?: string | null;
  isChild: boolean;
  groupId: string | null;
  groupName: string | null;
  age: number | null;
};

interface InscriptosPanelProps {
  participants: InscriptosParticipant[];
  groups: Group[];
  canAssignGroups: boolean;
  enrolledCount: number;
  capacity?: number | null;
}

export default function InscriptosPanel({
  participants,
  groups,
  canAssignGroups,
  enrolledCount,
  capacity,
}: InscriptosPanelProps) {
  const router = useRouter();

  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [draggingParticipantId, setDraggingParticipantId] = useState<
    string | null
  >(null);
  const [dropTargetGroupId, setDropTargetGroupId] = useState<string | null>(
    null
  );
  const [selectedParticipantIdForAssign, setSelectedParticipantIdForAssign] =
    useState<string | null>(null);


  const hasCapacity = capacity != null;
  const remainingSpots = hasCapacity
    ? Math.max(capacity! - enrolledCount, 0)
    : null;

  async function saveGroup(participantId: string, overrideGroupId?: string) {
    const participant = participants.find((p) => p.id === participantId);
    if (!participant) return;

    const nextGroupId = overrideGroupId ?? '';
    const currentGroupId = participant.groupId ?? '';
    if (nextGroupId === currentGroupId) return;

    setError('');
    setSavingId(participantId);

    try {
      if (!nextGroupId) {
        const res = await fetch(
          `/api/activity-groups/${currentGroupId}/members`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participantId }),
          }
        );
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error || 'No se pudo quitar del grupo');
        }
      } else {
        const res = await fetch(`/api/activity-groups/${nextGroupId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error || 'No se pudo asignar el grupo');
        }
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo actualizar el grupo'
      );
    } finally {
      setSavingId(null);
    }
  }

  const unassignedParticipants = participants.filter((p) => !p.groupId);


  async function handleDropInGroup(targetGroupId: string) {
    const participantId =
      draggingParticipantId ?? selectedParticipantIdForAssign;
    if (!participantId || savingId) return;

    setDropTargetGroupId(null);
    await saveGroup(participantId, targetGroupId);
    setDraggingParticipantId(null);
    setSelectedParticipantIdForAssign(null);
  }

  function handleDragStart(participantId: string) {
    setError('');
    setDraggingParticipantId(participantId);
  }

  function handleDragEnd() {
    setDraggingParticipantId(null);
    setDropTargetGroupId(null);
  }

  function handleParticipantTapToAssign(participantId: string) {
    if (!canAssignGroups || savingId) return;
    setError('');
    setSelectedParticipantIdForAssign((current) =>
      current === participantId ? null : participantId
    );
  }

  return (
    <section className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold">Inscriptos</h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            {enrolledCount} inscripto{enrolledCount === 1 ? '' : 's'}
          </p>
        </div>
        {hasCapacity && (
          <div className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
            {remainingSpots} lugares disponibles
          </div>
        )}
      </div>

      {participants.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground font-body">
          Aún no hay inscriptos en esta actividad.
        </p>
      ) : (
        <>
          <div className="mt-6 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Canvas de grupos</p>
              <p className="text-xs text-muted-foreground font-body">
                Arrastrá y soltá (desktop) o tocá participante y luego destino (móvil).
              </p>
            </div>

            <div className="mt-4 rounded-lg border border-dashed bg-background p-4">
              <p className="text-sm font-semibold">Sin grupo ({unassignedParticipants.length})</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {unassignedParticipants.map((participant) => (
                  <li
                    key={participant.id}
                    draggable={canAssignGroups && groups.length > 0}
                    onDragStart={() => handleDragStart(participant.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleParticipantTapToAssign(participant.id)}
                    className={`rounded-md border bg-card px-3 py-2 transition-colors ${canAssignGroups && groups.length > 0 ? 'cursor-pointer md:cursor-grab md:active:cursor-grabbing' : ''} ${selectedParticipantIdForAssign === participant.id ? 'border-primary bg-primary/5' : ''}`}
                  >
                    <p className="font-medium">{participant.name}</p>
                    <p className="text-sm text-muted-foreground font-body">{participant.subtitle}</p>
                    {participant.age != null && (
                      <p className="text-xs text-muted-foreground font-body">Edad: {participant.age}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => {
                const members = participants.filter((p) => p.groupId === group.id);
                return (
                  <div
                    key={group.id}
                    onDragOver={(event) => {
                      if (!canAssignGroups || savingId) return;
                      event.preventDefault();
                      setDropTargetGroupId(group.id);
                    }}
                    onDragLeave={() => {
                      if (dropTargetGroupId === group.id) setDropTargetGroupId(null);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      void handleDropInGroup(group.id);
                    }}
                    onClick={() => {
                      void handleDropInGroup(group.id);
                    }}
                    className={`rounded-lg border p-4 transition-colors ${dropTargetGroupId === group.id ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
                  >
                    <p className="font-medium">{group.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground font-body">{members.length} integrante{members.length === 1 ? '' : 's'}</p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {members.map((member) => (
                        <li
                          key={member.id}
                          className="relative rounded-md border bg-background px-3 py-1.5"
                        >
                          {canAssignGroups && (
                            <button
                              type="button"
                              disabled={savingId === member.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                void saveGroup(member.id, '');
                              }}
                              className="absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full border bg-card text-[10px] text-muted-foreground hover:bg-destructive hover:text-white transition-colors disabled:opacity-60"
                            >
                              ×
                            </button>
                          )}
                          <p className="text-xs font-medium leading-tight">{member.name}</p>
                          {member.age != null && (
                            <p className="text-[11px] text-muted-foreground">{member.age} años</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </section>
  );
}
