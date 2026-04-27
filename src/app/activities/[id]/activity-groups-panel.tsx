'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ActivityGroupForm from './activity-group-form';

type ActivityGroup = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  dayCount: number;
};

type Registration = {
  id: string;
  label: string;
  groupId: string | null;
  groupName: string | null;
};

interface ActivityGroupsPanelProps {
  activityId: string;
  canManageGroups: boolean;
  groups: ActivityGroup[];
  registrations: Registration[];
}

export default function ActivityGroupsPanel({
  activityId,
  canManageGroups,
  groups,
  registrations,
}: ActivityGroupsPanelProps) {
  const router = useRouter();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function updateMembership(
    groupId: string,
    participantId: string,
    currentGroupId: string | null
  ) {
    const key = `${participantId}:${groupId}`;
    setError('');
    setSavingKey(key);

    try {
      const isLeaving = currentGroupId === groupId;
      const res = await fetch(`/api/activity-groups/${groupId}/members`, {
        method: isLeaving ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo actualizar el grupo');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el grupo');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <section className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold">Grupos</h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Los grupos organizan a los inscriptos y permiten restringir
            sesiones a un grupo específico.
          </p>
        </div>
        {canManageGroups && (
          <div className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
            Administración de grupos
          </div>
        )}
      </div>

      {canManageGroups && (
        <div className="mt-5">
          <ActivityGroupForm activityId={activityId} />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            Tus inscriptos
          </h3>
          {registrations.length === 0 ? (
            <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
              No tenés inscriptos propios para agrupar.
            </p>
          ) : (
            <div className="space-y-3">
              {registrations.map((registration) => {
                const isGrouped = registration.groupId != null;
                return (
                  <article
                    key={registration.id}
                    className="rounded-lg border bg-background p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium">{registration.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Grupo actual:{' '}
                          {registration.groupName ?? 'Sin grupo'}
                        </p>
                      </div>
                      {registration.groupName && (
                        <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                          {registration.groupName}
                        </span>
                      )}
                    </div>

                    {groups.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {groups.map((group) => {
                          const isCurrentGroup =
                            registration.groupId === group.id;
                          const isSaving = savingKey === `${registration.id}:${group.id}`;

                          return (
                            <button
                              key={group.id}
                              type="button"
                              disabled={isSaving}
                              onClick={() =>
                                updateMembership(
                                  group.id,
                                  registration.id,
                                  registration.groupId
                                )
                              }
                              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                                isCurrentGroup
                                  ? 'bg-primary text-primary-foreground'
                                  : 'border border-border bg-background text-foreground hover:bg-muted'
                              }`}
                            >
                              {isSaving
                                ? 'Guardando...'
                                : isCurrentGroup
                                  ? 'Salir'
                                  : isGrouped
                                    ? 'Mover aquí'
                                    : 'Unirse'}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Creá grupos primero para poder asignar inscriptos.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Grupos creados</h3>
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
                    </div>
                    <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                      {group.memberCount} inscriptos
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {group.dayCount} sesión{group.dayCount === 1 ? '' : 'es'} asignada{group.dayCount === 1 ? '' : 's'}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </section>
  );
}
