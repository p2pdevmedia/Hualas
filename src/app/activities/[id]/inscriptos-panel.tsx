'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Group = {
  id: string;
  name: string;
  capacity: number | null;
  minAge: number | null;
  maxAge: number | null;
};

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
  whatsappPhone?: string | null;
};

function getWhatsAppUrl(phone: string) {
  const cleaned = phone.replace(/\D/g, '');
  const withCountry = cleaned.startsWith('54') ? cleaned : `54${cleaned}`;
  return `https://wa.me/${withCountry}`;
}

function WhatsAppButton({ phone }: { phone: string }) {
  return (
    <a
      href={getWhatsAppUrl(phone)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="Contactar por WhatsApp"
      className="inline-flex items-center justify-center rounded-full p-1.5 text-white bg-[#25D366] hover:bg-[#1ebe5d] transition-colors shrink-0"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.133.558 4.133 1.535 5.867L0 24l6.335-1.502A11.947 11.947 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.814 9.814 0 01-5.009-1.373l-.36-.214-3.732.885.939-3.63-.234-.373A9.77 9.77 0 012.182 12c0-5.418 4.4-9.818 9.818-9.818 5.418 0 9.818 4.4 9.818 9.818 0 5.418-4.4 9.818-9.818 9.818z" />
      </svg>
    </a>
  );
}

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
  const [search, setSearch] = useState('');

  const hasCapacity = capacity != null;
  const remainingSpots = hasCapacity
    ? Math.max(capacity! - enrolledCount, 0)
    : null;

  const normalizedSearch = search.trim().toLowerCase();
  const filteredParticipants = useMemo(() => {
    if (!normalizedSearch) return participants;

    return participants.filter((participant) =>
      [
        participant.name,
        participant.subtitle,
        participant.groupName ?? '',
        participant.age != null ? String(participant.age) : '',
        participant.whatsappPhone ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [normalizedSearch, participants]);
  const hasFilteredResults =
    !normalizedSearch || filteredParticipants.length > 0;

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

  const unassignedParticipants = filteredParticipants.filter((p) => !p.groupId);

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
            {normalizedSearch
              ? ` · ${filteredParticipants.length} resultado${filteredParticipants.length === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          {hasCapacity && (
            <div className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
              {remainingSpots} lugares disponibles
            </div>
          )}
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar inscripto"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-64"
          />
        </div>
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
              {canAssignGroups && (
                <p className="text-xs text-muted-foreground font-body">
                  Arrastrá y soltá (desktop) o tocá participante y luego destino
                  (móvil).
                </p>
              )}
            </div>

            {!hasFilteredResults ? (
              <p className="mt-4 rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
                No se encontraron inscriptos con esa búsqueda.
              </p>
            ) : null}

            {hasFilteredResults ? (
              <>
                <div className="mt-4 rounded-lg border border-dashed bg-background p-4">
                  <p className="text-sm font-semibold">
                    Sin grupo ({unassignedParticipants.length})
                  </p>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {unassignedParticipants.map((participant) => (
                      <li
                        key={participant.id}
                        draggable={canAssignGroups && groups.length > 0}
                        onDragStart={() => handleDragStart(participant.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() =>
                          handleParticipantTapToAssign(participant.id)
                        }
                        className={`rounded-md border bg-card px-3 py-1.5 transition-colors ${canAssignGroups && groups.length > 0 ? 'cursor-pointer md:cursor-grab md:active:cursor-grabbing' : ''} ${selectedParticipantIdForAssign === participant.id ? 'border-primary bg-primary/5' : ''}`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium leading-tight">
                            {participant.name}
                          </p>
                          {participant.age != null && (
                            <p className="text-[11px] text-muted-foreground">
                              {participant.age} años
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {groups.map((group) => {
                    const members = filteredParticipants.filter(
                      (p) => p.groupId === group.id
                    );
                    return (
                      <div
                        key={group.id}
                        onDragOver={(event) => {
                          if (!canAssignGroups || savingId) return;
                          event.preventDefault();
                          setDropTargetGroupId(group.id);
                        }}
                        onDragLeave={() => {
                          if (dropTargetGroupId === group.id)
                            setDropTargetGroupId(null);
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
                        <p className="mt-1 text-xs text-muted-foreground font-body">
                          {members.length} integrante
                          {members.length === 1 ? '' : 's'}
                          {group.capacity != null
                            ? ` de ${group.capacity}`
                            : ''}
                        </p>
                        {group.minAge != null && group.maxAge != null && (
                          <p className="mt-1 text-xs text-muted-foreground font-body">
                            {group.minAge} a {group.maxAge} años
                          </p>
                        )}
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
                              <div className="flex items-start justify-between gap-1">
                                <div className="min-w-0">
                                  <p className="text-xs font-medium leading-tight">
                                    {member.name}
                                  </p>
                                  {member.age != null && (
                                    <p className="text-[11px] text-muted-foreground">
                                      {member.age} años
                                    </p>
                                  )}
                                </div>
                                {member.whatsappPhone && (
                                  <WhatsAppButton
                                    phone={member.whatsappPhone}
                                  />
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>
        </>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </section>
  );
}
