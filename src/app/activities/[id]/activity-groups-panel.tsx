'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ActivityGroupForm from './activity-group-form';

type ActivityGroup = {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  minAge: number | null;
  maxAge: number | null;
  startTime: string | null;
  endTime: string | null;
  memberCount: number;
  dayCount: number;
};

type Participant = {
  id: string;
  label: string;
  groupId: string | null;
  groupName: string | null;
};

interface ActivityGroupsPanelProps {
  activityId: string;
  canManageGroups: boolean;
  groups: ActivityGroup[];
  participants: Participant[];
}

export default function ActivityGroupsPanel({
  activityId,
  canManageGroups,
  groups,
  participants,
}: ActivityGroupsPanelProps) {
  const router = useRouter();
  const [showGroupsPanel, setShowGroupsPanel] = useState(false);
  const [savingParticipantId, setSavingParticipantId] = useState<string | null>(
    null
  );
  const [error, setError] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    setSelectedGroups(
      Object.fromEntries(
        participants.map((participant) => [
          participant.id,
          participant.groupId ?? '',
        ])
      )
    );
  }, [participants]);

  async function saveParticipantGroup(participantId: string) {
    const participant = participants.find((item) => item.id === participantId);
    if (!participant) {
      return;
    }

    const nextGroupId = selectedGroups[participantId] ?? '';
    const currentGroupId = participant.groupId ?? '';
    if (nextGroupId === currentGroupId) {
      return;
    }

    setError('');
    setSavingParticipantId(participantId);

    try {
      if (!nextGroupId) {
        if (!currentGroupId) {
          return;
        }
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
      setSavingParticipantId(null);
    }
  }

  return (
    <section className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold">Grupos</h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Los profesores y administradores crean grupos y asignan inscriptos a
            cada uno.
          </p>
        </div>
        {canManageGroups && (
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
              Administración de grupos
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowGroupsPanel((current) => !current)}
            >
              {showGroupsPanel ? 'Ocultar grupos' : 'Administrar grupos'}
            </Button>
          </div>
        )}
      </div>

      {showGroupsPanel ? (
        <>
          {canManageGroups && (
            <div className="mt-5">
              <ActivityGroupForm activityId={activityId} />
            </div>
          )}

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                Inscriptos de la actividad
              </h3>
              {participants.length === 0 ? (
                <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                  Todavía no hay inscriptos para asignar.
                </p>
              ) : (
                <div className="space-y-3">
                  {participants.map((participant) => {
                    const selectedGroupId =
                      selectedGroups[participant.id] ?? '';
                    const currentGroupId = participant.groupId ?? '';
                    const isSaving = savingParticipantId === participant.id;

                    return (
                      <article
                        key={participant.id}
                        className="rounded-lg border bg-background p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium">{participant.label}</p>
                            <p className="text-xs text-muted-foreground">
                              Grupo actual:{' '}
                              {participant.groupName ?? 'Sin grupo'}
                            </p>
                          </div>
                          {participant.groupName && (
                            <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                              {participant.groupName}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                          <select
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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
                            onClick={() => saveParticipantGroup(participant.id)}
                            className="rounded-md border border-border bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSaving ? 'Guardando...' : 'Guardar grupo'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                Grupos creados
              </h3>
              {groups.length === 0 ? (
                <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                  Todavía no hay grupos creados.
                </p>
              ) : (
                <div className="space-y-3">
                  {groups.map((group) => (
                    <article
                      key={group.id}
                      className="rounded-lg border bg-background p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{group.name}</p>
                          {group.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {group.description}
                            </p>
                          )}
                          {group.capacity != null &&
                            group.minAge != null &&
                            group.maxAge != null &&
                            group.startTime &&
                            group.endTime && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Cupo {group.capacity} · {group.minAge} a{' '}
                                {group.maxAge} años · {group.startTime} a{' '}
                                {group.endTime}
                              </p>
                            )}
                        </div>
                        <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                          {group.memberCount} inscriptos
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                          {group.dayCount} sesión
                          {group.dayCount === 1 ? '' : 'es'} asignada
                          {group.dayCount === 1 ? '' : 's'}
                        </p>
                        <Link
                          href={`/activities/${activityId}/groups/${group.id}`}
                          className="inline-flex items-center justify-center rounded-full border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
                        >
                          Ver grupo
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-lg border bg-background p-4 text-sm text-muted-foreground">
          La administración de grupos está oculta. Puedes volver a abrirla con
          el botón de arriba.
        </div>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </section>
  );
}
