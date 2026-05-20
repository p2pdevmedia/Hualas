'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SPORT_ICONS } from '@/lib/sport-icons';
import { pesosToCents } from '@/lib/accounting';
import ProfessorPicker from '../professor-picker';

type ProfessorOption = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
};

type GroupDraft = {
  tempId: string;
  name: string;
  description: string;
  capacity: string;
  minAge: string;
  maxAge: string;
  professorIds: string[];
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type AnnualScheduleDraft = {
  tempId: string;
  weekday: string;
  schedule: string;
  groupTempId: string;
  professorIds: string[];
};

type AnnualSharedDraft = {
  geoLocation: string;
  coordinates: Coordinates | null;
  sportIcon: string;
};

const WEEKDAY_OPTIONS = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sábado' },
];

const LocationMapPicker = dynamic(() => import('../location-map-picker'), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center rounded-lg border bg-muted/20 text-sm text-muted-foreground">
      Cargando mapa...
    </div>
  ),
});

interface CreateActivityFormProps {
  professors: ProfessorOption[];
  onSuccess?: (activityId: string) => void;
}

function createEmptyAnnualScheduleDraft(): AnnualScheduleDraft {
  return {
    tempId: crypto.randomUUID(),
    weekday: '1',
    schedule: '',
    groupTempId: '',
    professorIds: [],
  };
}

export default function CreateActivityForm({
  professors,
  onSuccess,
}: CreateActivityFormProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activityType, setActivityType] = useState<'TEMPORARY' | 'ANNUAL'>(
    'TEMPORARY'
  );
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [professorIds, setProfessorIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<GroupDraft[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCapacity, setNewGroupCapacity] = useState('');
  const [newGroupMinAge, setNewGroupMinAge] = useState('');
  const [newGroupMaxAge, setNewGroupMaxAge] = useState('');
  const [newGroupProfessorId, setNewGroupProfessorId] = useState('');
  const [annualSchedules, setAnnualSchedules] = useState<AnnualScheduleDraft[]>(
    []
  );
  const [annualShared, setAnnualShared] = useState<AnnualSharedDraft>({
    geoLocation: '',
    coordinates: null,
    sportIcon: '',
  });
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedProfessors = professors.filter((professor) =>
    professorIds.includes(professor.id)
  );

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  function addGroupDraft() {
    if (
      !newGroupName.trim() ||
      !newGroupCapacity ||
      !newGroupMinAge ||
      !newGroupMaxAge ||
      !newGroupProfessorId
    ) {
      setError('Completá nombre, cupo, edades y profesor del grupo');
      return;
    }
    if (Number(newGroupCapacity) < 1) {
      setError('El cupo del grupo debe ser mayor a cero');
      return;
    }
    if (Number(newGroupMaxAge) < Number(newGroupMinAge)) {
      setError('La edad máxima del grupo debe ser mayor o igual a la mínima');
      return;
    }
    setError('');
    setGroups((current) => [
      ...current,
      {
        tempId: crypto.randomUUID(),
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        capacity: newGroupCapacity,
        minAge: newGroupMinAge,
        maxAge: newGroupMaxAge,
        professorIds: [newGroupProfessorId],
      },
    ]);
    setNewGroupName('');
    setNewGroupDesc('');
    setNewGroupCapacity('');
    setNewGroupMinAge('');
    setNewGroupMaxAge('');
    setNewGroupProfessorId('');
  }

  function removeGroupDraft(tempId: string) {
    setGroups((current) => current.filter((group) => group.tempId !== tempId));
  }

  function addAnnualScheduleDraft(weekday = '1') {
    setAnnualSchedules((current) => [
      ...current,
      { ...createEmptyAnnualScheduleDraft(), weekday },
    ]);
  }

  function updateAnnualScheduleDraft(
    tempId: string,
    updates: Partial<AnnualScheduleDraft>
  ) {
    setAnnualSchedules((current) =>
      current.map((draft) =>
        draft.tempId === tempId ? { ...draft, ...updates } : draft
      )
    );
  }

  function removeAnnualScheduleDraft(tempId: string) {
    setAnnualSchedules((current) =>
      current.filter((draft) => draft.tempId !== tempId)
    );
  }

  function toggleDayCollapse(dayValue: string) {
    setCollapsedDays((current) => {
      const next = new Set(current);
      if (next.has(dayValue)) next.delete(dayValue);
      else next.add(dayValue);
      return next;
    });
  }

  function resetForm() {
    setName('');
    setDate('');
    setEndDate('');
    setActivityType('TEMPORARY');
    setDescription('');
    setPrice('');
    setProfessorIds([]);
    setGroups([]);
    setNewGroupName('');
    setNewGroupDesc('');
    setNewGroupCapacity('');
    setNewGroupMinAge('');
    setNewGroupMaxAge('');
    setNewGroupProfessorId('');
    setAnnualSchedules([]);
    setAnnualShared({
      geoLocation: '',
      coordinates: null,
      sportIcon: '',
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (!date || !endDate) {
        throw new Error('Completá fecha de inicio y fecha de fin');
      }

      const normalizedAnnualSchedules =
        activityType === 'ANNUAL'
          ? annualSchedules.map((draft, index) => {
              if (!draft.schedule.trim()) {
                throw new Error(
                  `Completá el horario de la sesión ${index + 1}`
                );
              }
              if (draft.professorIds.length === 0) {
                throw new Error(
                  `Seleccioná al menos un profesor en la sesión ${index + 1}`
                );
              }

              return {
                tempId: draft.tempId,
                weekday: Number(draft.weekday),
                schedule: draft.schedule.trim(),
                groupTempId: draft.groupTempId || undefined,
                professorIds: draft.professorIds,
              };
            })
          : [];

      if (activityType === 'ANNUAL') {
        if (!annualShared.geoLocation.trim()) {
          throw new Error('Completá la ubicación compartida');
        }
        if (!annualShared.coordinates) {
          throw new Error('Seleccioná un punto en el mapa compartido');
        }
        if (!annualShared.sportIcon) {
          throw new Error('Seleccioná un deporte compartido');
        }
      }

      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          date,
          endDate,
          activityType,
          description: description || undefined,
          price: pesosToCents(Number(price)),
          professorIds,
          groups: groups.map((group) => ({
            tempId: group.tempId,
            name: group.name,
            description: group.description || undefined,
            capacity: Number(group.capacity),
            minAge: Number(group.minAge),
            maxAge: Number(group.maxAge),
            professorIds: group.professorIds,
          })),
          annualSchedules: normalizedAnnualSchedules,
          geoLocation:
            activityType === 'ANNUAL'
              ? annualShared.geoLocation.trim()
              : undefined,
          latitude:
            activityType === 'ANNUAL'
              ? annualShared.coordinates!.latitude
              : undefined,
          longitude:
            activityType === 'ANNUAL'
              ? annualShared.coordinates!.longitude
              : undefined,
          sportIcon:
            activityType === 'ANNUAL'
              ? annualShared.sportIcon || undefined
              : undefined,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo crear la actividad');
      }

      const json = await res.json();

      setSuccess('Actividad creada');
      resetForm();
      onSuccess?.(json.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo crear la actividad'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Nombre de la actividad"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={inputClass}
        required
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Fecha de inicio</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Fecha de fin</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Tipo de actividad</label>
        <select
          value={activityType}
          onChange={(e) =>
            setActivityType(e.target.value as 'TEMPORARY' | 'ANNUAL')
          }
          className={inputClass}
        >
          <option value="TEMPORARY">Temporal</option>
          <option value="ANNUAL">Anual</option>
        </select>
      </div>

      <textarea
        placeholder="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className={`${inputClass} min-h-[80px] resize-y`}
      />

      <input
        type="number"
        placeholder="Precio en pesos"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className={inputClass}
        min={0}
        step="0.01"
        required
      />

      <div className="space-y-3 rounded-lg border bg-background p-4">
        <p className="text-sm font-semibold">Grupos</p>

        {groups.length > 0 && (
          <ul className="space-y-2">
            {groups.map((group) => (
              <li
                key={group.tempId}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>
                  {group.name}
                  {group.description && (
                    <span className="ml-2 text-muted-foreground">
                      - {group.description}
                    </span>
                  )}
                  <span className="ml-2 text-muted-foreground">
                    - Cupo {group.capacity} - {group.minAge} a {group.maxAge}{' '}
                    años
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    - Profesor:{' '}
                    {professors.find((p) => p.id === group.professorIds[0])
                      ?.name ?? 'Sin nombre'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removeGroupDraft(group.tempId)}
                  className="ml-4 text-xs text-destructive hover:text-destructive/80"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid items-end gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_130px_110px_110px_110px_auto]">
          <input
            type="text"
            placeholder="Nombre del grupo"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className={inputClass}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addGroupDraft();
              }
            }}
          />
          <input
            type="text"
            placeholder="Descripción (opcional)"
            value={newGroupDesc}
            onChange={(e) => setNewGroupDesc(e.target.value)}
            className={inputClass}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addGroupDraft();
              }
            }}
          />
          <input
            type="number"
            min={1}
            placeholder="Cupo"
            value={newGroupCapacity}
            onChange={(e) => setNewGroupCapacity(e.target.value)}
            className={inputClass}
          />
          <input
            type="number"
            min={0}
            placeholder="Edad mín."
            value={newGroupMinAge}
            onChange={(e) => setNewGroupMinAge(e.target.value)}
            className={inputClass}
          />
          <input
            type="number"
            min={0}
            placeholder="Edad máx."
            value={newGroupMaxAge}
            onChange={(e) => setNewGroupMaxAge(e.target.value)}
            className={inputClass}
          />
          <select
            value={newGroupProfessorId}
            onChange={(e) => setNewGroupProfessorId(e.target.value)}
            className={inputClass}
          >
            <option value="">Profesor del grupo</option>
            {selectedProfessors.map((professor) => (
              <option key={professor.id} value={professor.id}>
                {professor.name ?? 'Sin nombre'} {professor.lastName ?? ''}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" onClick={addGroupDraft}>
            Agregar
          </Button>
        </div>
      </div>

      <ProfessorPicker
        professors={professors}
        value={professorIds}
        onChange={setProfessorIds}
      />

      {activityType === 'ANNUAL' && (
        <div className="space-y-4 rounded-lg border bg-background p-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Ubicación compartida
              </label>
              <input
                type="text"
                placeholder="Nombre o referencia del lugar"
                value={annualShared.geoLocation}
                onChange={(e) =>
                  setAnnualShared((current) => ({
                    ...current,
                    geoLocation: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Punto en el mapa</p>
              <LocationMapPicker
                value={annualShared.coordinates}
                onChange={(coordinates) =>
                  setAnnualShared((current) => ({
                    ...current,
                    coordinates,
                  }))
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Deporte compartido</label>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {SPORT_ICONS.map((icon) => (
                  <button
                    key={icon.file}
                    type="button"
                    onClick={() =>
                      setAnnualShared((current) => ({
                        ...current,
                        sportIcon:
                          current.sportIcon === icon.file ? '' : icon.file,
                      }))
                    }
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors ${
                      annualShared.sportIcon === icon.file
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Image
                      src={`/icons/${icon.file}`}
                      alt={icon.label}
                      width={40}
                      height={40}
                    />
                    <span>{icon.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-sm font-semibold">Calendario semanal</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {WEEKDAY_OPTIONS.slice(1)
              .concat(WEEKDAY_OPTIONS[0])
              .map((day) => {
                const daySessions = annualSchedules.filter(
                  (draft) => draft.weekday === day.value
                );
                const isCollapsed = collapsedDays.has(day.value);
                return (
                  <div
                    key={day.value}
                    className="space-y-2 rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{day.label}</p>
                      <div className="flex items-center gap-1">
                        {daySessions.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleDayCollapse(day.value)}
                            className="h-7 rounded border px-2 text-xs text-muted-foreground hover:bg-muted"
                          >
                            {isCollapsed ? '✏️ Editar' : '👁 Ver'}
                          </button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => addAnnualScheduleDraft(day.value)}
                        >
                          + Sesión
                        </Button>
                      </div>
                    </div>
                    {daySessions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Sin sesiones.
                      </p>
                    ) : isCollapsed ? (
                      <ul className="space-y-1">
                        {daySessions.map((draft) => {
                          const groupName =
                            groups.find((g) => g.tempId === draft.groupTempId)
                              ?.name ?? 'Sin grupo';
                          const profNames = selectedProfessors
                            .filter((p) => draft.professorIds.includes(p.id))
                            .map((p) =>
                              `${p.name ?? ''} ${p.lastName ?? ''}`.trim()
                            )
                            .join(', ');
                          return (
                            <li
                              key={draft.tempId}
                              className="rounded-md bg-muted/40 px-2 py-1.5 text-xs"
                            >
                              <span className="font-medium">
                                {draft.schedule || '(sin horario)'}
                              </span>
                              <span className="mx-1 text-muted-foreground">
                                ·
                              </span>
                              <span className="text-muted-foreground">
                                {groupName}
                              </span>
                              {profNames && (
                                <>
                                  <span className="mx-1 text-muted-foreground">
                                    ·
                                  </span>
                                  <span className="text-muted-foreground">
                                    {profNames}
                                  </span>
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      daySessions.map((draft) => (
                        <div
                          key={draft.tempId}
                          className="space-y-2 rounded-md border p-2"
                        >
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                removeAnnualScheduleDraft(draft.tempId)
                              }
                              className="text-xs text-destructive"
                            >
                              Quitar
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Horario"
                            value={draft.schedule}
                            onChange={(e) =>
                              updateAnnualScheduleDraft(draft.tempId, {
                                schedule: e.target.value,
                              })
                            }
                            className={inputClass}
                          />
                          <select
                            value={draft.groupTempId}
                            onChange={(e) =>
                              updateAnnualScheduleDraft(draft.tempId, {
                                groupTempId: e.target.value,
                              })
                            }
                            className={inputClass}
                          >
                            <option value="">Sin grupo</option>
                            {groups.map((group) => (
                              <option key={group.tempId} value={group.tempId}>
                                {group.name}
                              </option>
                            ))}
                          </select>
                          <div className="max-h-28 space-y-1 overflow-auto rounded border p-2">
                            {selectedProfessors.map((professor) => (
                              <label
                                key={professor.id}
                                className="flex items-center gap-2 text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={draft.professorIds.includes(
                                    professor.id
                                  )}
                                  onChange={(e) =>
                                    updateAnnualScheduleDraft(draft.tempId, {
                                      professorIds: e.target.checked
                                        ? [...draft.professorIds, professor.id]
                                        : draft.professorIds.filter(
                                            (id) => id !== professor.id
                                          ),
                                    })
                                  }
                                />
                                {professor.name ?? 'Sin nombre'}{' '}
                                {professor.lastName ?? ''}
                              </label>
                            ))}
                            {selectedProfessors.length === 0 && (
                              <p className="text-xs text-muted-foreground">
                                Seleccioná profesores de la actividad para
                                asignarlos a esta sesión.
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar'}
      </Button>
    </form>
  );
}
