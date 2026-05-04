'use client';

import { useEffect, useState } from 'react';
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
  const [selectedGroups, setSelectedGroups] = useState<Record<string, string>>(
    {}
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'groups' | 'unassigned'>(
    'all'
  );

  useEffect(() => {
    setSelectedGroups(
      Object.fromEntries(participants.map((p) => [p.id, p.groupId ?? '']))
    );
  }, [participants]);

  const hasCapacity = capacity != null;
  const remainingSpots = hasCapacity
    ? Math.max(capacity! - enrolledCount, 0)
    : null;

  async function saveGroup(participantId: string) {
    const participant = participants.find((p) => p.id === participantId);
    if (!participant) return;

    const nextGroupId = selectedGroups[participantId] ?? '';
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
  const groupsWithMembers = groups
    .map((group) => ({
      ...group,
      members: participants.filter(
        (participant) => participant.groupId === group.id
      ),
    }))
    .filter((group) => group.members.length > 0);

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
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`rounded-full border px-3 py-1.5 text-sm font-body transition-colors ${activeTab === 'all' ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              Todos ({participants.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('groups')}
              className={`rounded-full border px-3 py-1.5 text-sm font-body transition-colors ${activeTab === 'groups' ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              Grupos asignados ({groupsWithMembers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unassigned')}
              className={`rounded-full border px-3 py-1.5 text-sm font-body transition-colors ${activeTab === 'unassigned' ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              Sin grupo ({unassignedParticipants.length})
            </button>
          </div>

          {activeTab === 'all' && (
            <ul className="mt-4 divide-y divide-border">
              {participants.map((participant) => {
                const selectedGroupId = selectedGroups[participant.id] ?? '';
                const currentGroupId = participant.groupId ?? '';
                const isSaving = savingId === participant.id;

                return (
                  <li
                    key={participant.id}
                    className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{participant.name}</p>
                      <p className="text-sm text-muted-foreground font-body">
                        {participant.subtitle}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground font-body">
                        {participant.receipt && (
                          <span>Comprobante {participant.receipt}</span>
                        )}
                        {participant.receiptDate && (
                          <span>
                            {participant.receipt ? '· ' : ''}
                            Pago aprobado el{' '}
                            {new Date(
                              participant.receiptDate
                            ).toLocaleDateString('es-AR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm text-muted-foreground font-body">
                        {participant.isChild ? 'Hijo/a' : 'Titular'}
                      </span>

                      {canAssignGroups && groups.length > 0 && (
                        <div className="flex items-center gap-2">
                          <select
                            className="rounded-md border bg-background px-2 py-1.5 text-sm"
                            value={selectedGroupId}
                            onChange={(e) =>
                              setSelectedGroups((current) => ({
                                ...current,
                                [participant.id]: e.target.value,
                              }))
                            }
                          >
                            <option value="">Sin grupo</option>
                            {groups.map((group) => (
                              <option key={group.id} value={group.id}>
                                {group.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={
                              isSaving || selectedGroupId === currentGroupId
                            }
                            onClick={() => saveGroup(participant.id)}
                            className="rounded-md border border-border bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSaving ? '...' : 'Guardar'}
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {activeTab === 'groups' && (
            <div className="mt-4 space-y-4">
              {groupsWithMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body">
                  Todavía no hay inscriptos asignados a grupos.
                </p>
              ) : (
                groupsWithMembers.map((group) => (
                  <div key={group.id} className="rounded-lg border p-4">
                    <p className="font-medium">{group.name}</p>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground font-body">
                      {group.members.map((member) => (
                        <li key={member.id}>{member.name}</li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'unassigned' && (
            <ul className="mt-4 divide-y divide-border">
              {unassignedParticipants.length === 0 ? (
                <li className="py-4 text-sm text-muted-foreground font-body">
                  Todos los inscriptos ya tienen grupo asignado.
                </li>
              ) : (
                unassignedParticipants.map((participant) => (
                  <li key={participant.id} className="py-4">
                    <p className="font-medium">{participant.name}</p>
                    <p className="text-sm text-muted-foreground font-body">
                      {participant.subtitle}
                    </p>
                  </li>
                ))
              )}
            </ul>
          )}
        </>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </section>
  );
}
