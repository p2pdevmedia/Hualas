'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Member = {
  participantId: string;
  label: string;
  subtitle: string;
  currentGroupName: string | null;
};

type AvailableParticipant = Member;

interface GroupTab {
  id: string;
  name: string;
}

interface ActivityGroupMembersManagerProps {
  groupId: string;
  groupName: string;
  members: Member[];
  availableParticipants: AvailableParticipant[];
  allGroups: GroupTab[];
}

export default function ActivityGroupMembersManager({
  groupId,
  groupName,
  members,
  availableParticipants,
  allGroups,
}: ActivityGroupMembersManagerProps) {
  const router = useRouter();
  const [selectedParticipantId, setSelectedParticipantId] = useState(
    availableParticipants[0]?.participantId ?? ''
  );
  const [savingParticipantId, setSavingParticipantId] = useState<string | null>(
    null
  );
  const [confirmRemoveMemberId, setConfirmRemoveMemberId] = useState<
    string | null
  >(null);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');

  const [selectedTab, setSelectedTab] = useState<string>('all');

  const selectableTabs = useMemo(
    () => [
      { id: 'all', name: 'Todos los grupos' },
      ...allGroups.filter((group) => group.id !== groupId),
    ],
    [allGroups, groupId]
  );

  const visibleParticipantsByTab = useMemo(() => {
    if (selectedTab === 'all') {
      return availableParticipants;
    }

    return availableParticipants.filter(
      (participant) =>
        participant.currentGroupName === selectedTab ||
        participant.currentGroupName === null
    );
  }, [availableParticipants, selectedTab]);

  const filteredAvailableParticipants = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    if (!normalized) {
      return visibleParticipantsByTab;
    }

    return visibleParticipantsByTab.filter((participant) =>
      participant.label.toLowerCase().includes(normalized)
    );
  }, [visibleParticipantsByTab, searchTerm]);

  useEffect(() => {
    if (filteredAvailableParticipants.length === 0) {
      setSelectedParticipantId('');
      return;
    }

    const selectedExists = filteredAvailableParticipants.some(
      (participant) => participant.participantId === selectedParticipantId
    );

    if (!selectedExists) {
      setSelectedParticipantId(
        filteredAvailableParticipants[0]?.participantId ?? ''
      );
    }
  }, [filteredAvailableParticipants, selectedParticipantId]);

  async function mutateMembership(
    participantId: string,
    method: 'POST' | 'DELETE'
  ) {
    setError('');
    setSavingParticipantId(participantId);

    try {
      const res = await fetch(`/api/activity-groups/${groupId}/members`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(
          payload?.error || 'No se pudo actualizar la membresia del grupo'
        );
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

  async function handleAddParticipant(e: FormEvent) {
    e.preventDefault();

    if (!selectedParticipantId) {
      return;
    }

    await mutateMembership(selectedParticipantId, 'POST');
  }

  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold">
            Miembros del grupo
          </h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Agregá o quitá participantes de {groupName} desde esta vista.
          </p>
        </div>
        <div className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
          {members.length} miembro{members.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-background p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Miembros
          </p>
          <p className="mt-1 text-2xl font-semibold">{members.length}</p>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Disponibles
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {visibleParticipantsByTab.length}
          </p>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Estado
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Los participantes se mueven entre grupos en el momento.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            Participantes del grupo
          </h3>
          {members.length === 0 ? (
            <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
              Todavía no hay participantes en este grupo.
            </p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => {
                const isSaving = savingParticipantId === member.participantId;

                return (
                  <article
                    key={member.participantId}
                    className="rounded-lg border bg-background p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium">{member.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.subtitle}
                        </p>
                      </div>
                      {member.currentGroupName && (
                        <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                          {member.currentGroupName}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={isSaving}
                        onClick={() =>
                          setConfirmRemoveMemberId(member.participantId)
                        }
                        className="border-destructive text-destructive hover:bg-destructive/5"
                      >
                        {isSaving ? 'Quitando...' : 'Sacar del grupo'}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            Agregar participante
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectableTabs.map((tab) => {
              const isActive =
                selectedTab === tab.name ||
                (tab.id === 'all' && selectedTab === 'all');

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setSelectedTab(tab.id === 'all' ? 'all' : tab.name)
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>
          {visibleParticipantsByTab.length === 0 ? (
            <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
              No hay participantes disponibles para este filtro.
            </p>
          ) : (
            <form
              onSubmit={handleAddParticipant}
              className="space-y-3 rounded-lg border bg-background p-4"
            >
              <input
                type="text"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Buscar por nombre y apellido"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedParticipantId}
                onChange={(e) => setSelectedParticipantId(e.target.value)}
              >
                {filteredAvailableParticipants.map((participant) => (
                  <option
                    key={participant.participantId}
                    value={participant.participantId}
                  >
                    {participant.label}
                    {participant.currentGroupName
                      ? ` - ${participant.currentGroupName}`
                      : ''}
                  </option>
                ))}
              </select>
              {visibleParticipantsByTab.length > 0 &&
                filteredAvailableParticipants.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No se encontraron participantes con esa búsqueda.
                  </p>
                )}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Si el participante ya pertenece a otro grupo, se moverá a
                  {` ${groupName}.`}
                </p>
                <Button
                  type="submit"
                  disabled={
                    !selectedParticipantId ||
                    filteredAvailableParticipants.length === 0
                  }
                >
                  Agregar al grupo
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {confirmRemoveMemberId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-lg max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold mb-2">Sacar del grupo</h2>
            <p className="text-muted-foreground mb-6">
              ¿Estás seguro de que querés sacar a este participante del grupo?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmRemoveMemberId(null)}
                className="px-4 py-2 rounded-full border border-border hover:bg-muted transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = confirmRemoveMemberId;
                  setConfirmRemoveMemberId(null);
                  void mutateMembership(id, 'DELETE');
                }}
                className="px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Sacar del grupo
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
