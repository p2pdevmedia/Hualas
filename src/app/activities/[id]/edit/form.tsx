'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { SPORT_ICONS } from '@/lib/sport-icons';
import { centsToPesos, pesosToCents } from '@/lib/accounting';
import ProfessorPicker from '../../professor-picker';

type ProfessorOption = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
};

type ExistingGroup = {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  minAge: number | null;
  maxAge: number | null;
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
  groupId: string;
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

const LocationMapPicker = dynamic(() => import('../../location-map-picker'), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center rounded-lg border bg-muted/20 text-sm text-muted-foreground">
      Cargando mapa...
    </div>
  ),
});

interface EditActivityFormProps {
  activity: {
    id: string;
    name: string;
    date: string;
    endDate: string;
    activityType: 'TEMPORARY' | 'ANNUAL';
    description?: string | null;
    price: number;
    professorIds: string[];
  };
  annualDefaults?: AnnualSharedDraft;
  initialAnnualSchedules?: Omit<AnnualScheduleDraft, 'tempId'>[];
  professors: ProfessorOption[];
  initialGroups: ExistingGroup[];
  existingDayCount: number;
}

function createEmptyScheduleDraft(): AnnualScheduleDraft {
  return {
    tempId: crypto.randomUUID(),
    weekday: '1',
    schedule: '',
    groupId: '',
    professorIds: [],
  };
}

function formatProfessorName(professor: ProfessorOption) {
  return (
    `${professor.name ?? ''} ${professor.lastName ?? ''}`.trim() ||
    professor.email
  );
}

function GroupProfessorPicker({
  professors,
  value,
  onChange,
}: {
  professors: ProfessorOption[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedProfessors = professors.filter((professor) =>
    value.includes(professor.id)
  );
  const selectedLabel =
    selectedProfessors.length === 0
      ? 'Sin profesores'
      : selectedProfessors.length === 1
        ? '1 profesor'
        : `${selectedProfessors.length} profesores`;

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between"
        onClick={() => setOpen(true)}
      >
        <span>Profesores</span>
        <span className="text-xs font-normal text-muted-foreground">
          {selectedLabel}
        </span>
      </Button>

      {selectedProfessors.length > 0 && (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {selectedProfessors.map(formatProfessorName).join(', ')}
        </p>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-lg bg-background shadow-xl">
            <div className="border-b p-4">
              <h4 className="text-base font-semibold">Profesores</h4>
              <p className="text-xs text-muted-foreground">
                Selecciona uno o mas profesores para este grupo.
              </p>
            </div>

            <div className="max-h-[60vh] space-y-2 overflow-y-auto p-4">
              {professors.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Primero selecciona profesores para la actividad.
                </p>
              ) : (
                professors.map((professor) => {
                  const checked = value.includes(professor.id);
                  return (
                    <label
                      key={professor.id}
                      className="flex items-start gap-3 rounded-md border bg-background p-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          if (event.target.checked) {
                            onChange([...value, professor.id]);
                            return;
                          }
                          onChange(value.filter((id) => id !== professor.id));
                        }}
                        className="mt-1 accent-primary"
                      />
                      <span>
                        <span className="block font-medium">
                          {formatProfessorName(professor)}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {professor.email}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex justify-end border-t p-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditActivityForm({
  activity,
  annualDefaults,
  initialAnnualSchedules = [],
  professors,
  initialGroups,
  existingDayCount,
}: EditActivityFormProps) {
  const [name, setName] = useState(activity.name);
  const [date, setDate] = useState(activity.date);
  const [endDate, setEndDate] = useState(activity.endDate);
  const [activityType, setActivityType] = useState<'TEMPORARY' | 'ANNUAL'>(
    activity.activityType
  );
  const [description, setDescription] = useState(activity.description || '');
  const [price, setPrice] = useState(String(centsToPesos(activity.price)));
  const [professorIds, setProfessorIds] = useState<string[]>(
    activity.professorIds
  );

  const [annualSchedules, setAnnualSchedules] = useState<AnnualScheduleDraft[]>(
    initialAnnualSchedules.map((draft) => ({
      ...draft,
      tempId: crypto.randomUUID(),
    }))
  );
  const [annualShared, setAnnualShared] = useState<AnnualSharedDraft>(
    annualDefaults ?? {
      geoLocation: '',
      coordinates: null,
      sportIcon: '',
    }
  );

  const [existingGroups, setExistingGroups] =
    useState<ExistingGroup[]>(initialGroups);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCapacity, setNewGroupCapacity] = useState('');
  const [newGroupMinAge, setNewGroupMinAge] = useState('');
  const [newGroupMaxAge, setNewGroupMaxAge] = useState('');
  const [newGroupProfessorIds, setNewGroupProfessorIds] = useState<string[]>(
    []
  );
  const [groupError, setGroupError] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<
    string | null
  >(null);

  const [schedulesModified, setSchedulesModified] = useState(false);

  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(
    () => new Set(initialAnnualSchedules.map((s) => s.weekday))
  );
  const [confirmPending, setConfirmPending] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedProfessors = professors.filter((professor) =>
    professorIds.includes(professor.id)
  );

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  function handleActivityProfessorChange(nextProfessorIds: string[]) {
    setProfessorIds(nextProfessorIds);
    setNewGroupProfessorIds((current) =>
      current.filter((id) => nextProfessorIds.includes(id))
    );
  }

  function addAnnualScheduleDraft(weekday = '1') {
    setSchedulesModified(true);
    setAnnualSchedules((current) => [
      ...current,
      { ...createEmptyScheduleDraft(), weekday },
    ]);
    setCollapsedDays((current) => {
      const next = new Set(current);
      next.delete(weekday);
      return next;
    });
  }

  function updateScheduleDraft(
    tempId: string,
    updates: Partial<AnnualScheduleDraft>
  ) {
    setSchedulesModified(true);
    setAnnualSchedules((current) =>
      current.map((d) => (d.tempId === tempId ? { ...d, ...updates } : d))
    );
  }

  function removeScheduleDraft(tempId: string) {
    setSchedulesModified(true);
    setAnnualSchedules((current) => current.filter((d) => d.tempId !== tempId));
  }

  function toggleDayCollapse(dayValue: string) {
    setCollapsedDays((current) => {
      const next = new Set(current);
      if (next.has(dayValue)) next.delete(dayValue);
      else next.add(dayValue);
      return next;
    });
  }

  async function handleCreateGroup() {
    if (
      !newGroupName.trim() ||
      !newGroupCapacity ||
      !newGroupMinAge ||
      !newGroupMaxAge ||
      newGroupProfessorIds.length === 0
    ) {
      setGroupError('Completá nombre, cupo, edades y profesor del grupo');
      return;
    }
    if (Number(newGroupCapacity) < 1) {
      setGroupError('El cupo del grupo debe ser mayor a cero');
      return;
    }
    if (Number(newGroupMaxAge) < Number(newGroupMinAge)) {
      setGroupError(
        'La edad máxima del grupo debe ser mayor o igual a la mínima'
      );
      return;
    }
    setGroupError('');
    setCreatingGroup(true);
    try {
      const res = await fetch(`/api/activities/${activity.id}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDesc.trim() || undefined,
          capacity: Number(newGroupCapacity),
          minAge: Number(newGroupMinAge),
          maxAge: Number(newGroupMaxAge),
          professorIds: newGroupProfessorIds,
        }),
      });
      if (!res.ok) throw new Error('No se pudo crear el grupo');
      const group = await res.json();
      setExistingGroups((current) => [
        ...current,
        { ...group, professorIds: newGroupProfessorIds },
      ]);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupCapacity('');
      setNewGroupMinAge('');
      setNewGroupMaxAge('');
      setNewGroupProfessorIds([]);
    } catch (err) {
      setGroupError(
        err instanceof Error ? err.message : 'Error al crear el grupo'
      );
    } finally {
      setCreatingGroup(false);
    }
  }

  async function handleDeleteGroup(groupId: string) {
    setGroupError('');
    setDeletingGroupId(groupId);
    try {
      const res = await fetch(`/api/activity-groups/${groupId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('No se pudo eliminar el grupo');
      setExistingGroups((current) => current.filter((g) => g.id !== groupId));
      setAnnualSchedules((current) =>
        current.map((d) => (d.groupId === groupId ? { ...d, groupId: '' } : d))
      );
    } catch (err) {
      setGroupError(
        err instanceof Error ? err.message : 'Error al eliminar el grupo'
      );
    } finally {
      setDeletingGroupId(null);
    }
  }

  function buildConfirmMessage(): string | null {
    if (existingDayCount === 0) return null;

    if (activityType === 'TEMPORARY') {
      return `Esta acción borrará las ${existingDayCount} sesiones existentes de la actividad al cambiarla a Temporal. ¿Confirmás?`;
    }

    const datesChanged = date !== activity.date || endDate !== activity.endDate;
    if (activityType === 'ANNUAL' && (schedulesModified || datesChanged)) {
      return `Esta acción borrará las ${existingDayCount} sesiones existentes y creará nuevas según la configuración indicada. ¿Confirmás?`;
    }

    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (activityType === 'ANNUAL') {
      if (!annualShared.geoLocation.trim()) {
        setError('Completá la ubicación compartida');
        return;
      }
      if (!annualShared.coordinates) {
        setError('Seleccioná un punto en el mapa compartido');
        return;
      }
      if (!annualShared.sportIcon) {
        setError('Seleccioná un deporte compartido');
        return;
      }

      if (schedulesModified) {
        for (let i = 0; i < annualSchedules.length; i++) {
          const draft = annualSchedules[i];
          if (!draft.schedule.trim()) {
            setError(`Completá el horario de la sesión ${i + 1}`);
            return;
          }
          if (draft.professorIds.length === 0) {
            setError(`Seleccioná al menos un profesor en la sesión ${i + 1}`);
            return;
          }
        }
      }
    }

    const msg = buildConfirmMessage();
    if (msg) {
      setConfirmMessage(msg);
      setConfirmPending(true);
      return;
    }

    void doSave();
  }

  async function doSave() {
    setConfirmPending(false);
    setSaving(true);
    try {
      const datesChanged =
        date !== activity.date || endDate !== activity.endDate;
      const normalizedSchedules =
        activityType === 'ANNUAL' && (schedulesModified || datesChanged)
          ? annualSchedules.map((d) => ({
              tempId: d.tempId,
              weekday: Number(d.weekday),
              schedule: d.schedule.trim(),
              groupId: d.groupId || undefined,
              professorIds: d.professorIds,
            }))
          : [];

      const res = await fetch(`/api/activities/${activity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          date,
          endDate,
          activityType,
          description: description || undefined,
          price: pesosToCents(Number(price)),
          professorIds,
          annualSchedules: normalizedSchedules,
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
        throw new Error(payload?.error || 'No se pudo actualizar la actividad');
      }
      setSuccess('Actividad actualizada');
      setTimeout(() => {
        router.push('/activities');
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar la actividad'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {confirmPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-w-md rounded-lg bg-background p-6 shadow-lg">
            <p className="mb-6 text-sm">{confirmMessage}</p>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmPending(false)}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={() => void doSave()}>
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

      <Form onSubmit={handleSubmit} className="space-y-4">
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

          {existingGroups.length > 0 ? (
            <ul className="space-y-2">
              {existingGroups.map((group) => (
                <li
                  key={group.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    {group.name}
                    {group.description && (
                      <span className="ml-2 text-muted-foreground">
                        — {group.description}
                      </span>
                    )}
                    {group.capacity != null &&
                      group.minAge != null &&
                      group.maxAge != null && (
                        <span className="ml-2 text-muted-foreground">
                          — Cupo {group.capacity} — {group.minAge} a{' '}
                          {group.maxAge} años
                        </span>
                      )}
                  </span>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <Link
                      href={`/activities/${activity.id}/groups/${group.id}/edit`}
                      prefetch={true}
                      className="text-xs font-medium text-primary hover:text-primary/80"
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      disabled={deletingGroupId === group.id}
                      onClick={() => setConfirmDeleteGroupId(group.id)}
                      className="text-xs text-destructive hover:text-destructive/80 disabled:opacity-50"
                    >
                      {deletingGroupId === group.id
                        ? 'Eliminando...'
                        : 'Eliminar'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Sin grupos todavía.</p>
          )}

          <div className="grid gap-2 items-end sm:grid-cols-2 lg:grid-cols-[1fr_1fr_130px_110px_110px_minmax(180px,1fr)_auto]">
            <input
              type="text"
              placeholder="Nombre del grupo"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className={inputClass}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleCreateGroup();
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
                  void handleCreateGroup();
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
            <GroupProfessorPicker
              professors={selectedProfessors}
              value={newGroupProfessorIds}
              onChange={setNewGroupProfessorIds}
            />
            <Button
              type="button"
              variant="outline"
              disabled={creatingGroup}
              onClick={() => void handleCreateGroup()}
            >
              {creatingGroup ? 'Creando...' : 'Agregar'}
            </Button>
          </div>

          {groupError && (
            <p className="text-xs text-destructive">{groupError}</p>
          )}
        </div>

        <ProfessorPicker
          professors={professors}
          value={professorIds}
          onChange={handleActivityProfessorChange}
          defaultCollapsed
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
                <label className="text-sm font-medium">
                  Deporte compartido
                </label>
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
            <p className="text-xs text-muted-foreground">
              Solo modificá el calendario si querés regenerar las sesiones. Si
              no tocás nada, las sesiones existentes se conservan tal cual.
              {existingDayCount > 0 && (
                <span className="ml-1 font-medium text-amber-600">
                  Hay {existingDayCount} sesiones existentes.
                </span>
              )}
            </p>

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
                              existingGroups.find((g) => g.id === draft.groupId)
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
                                  removeScheduleDraft(draft.tempId)
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
                                updateScheduleDraft(draft.tempId, {
                                  schedule: e.target.value,
                                })
                              }
                              className={inputClass}
                            />
                            <select
                              value={draft.groupId}
                              onChange={(e) =>
                                updateScheduleDraft(draft.tempId, {
                                  groupId: e.target.value,
                                })
                              }
                              className={inputClass}
                            >
                              <option value="">Sin grupo</option>
                              {existingGroups.map((group) => (
                                <option key={group.id} value={group.id}>
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
                                      updateScheduleDraft(draft.tempId, {
                                        professorIds: e.target.checked
                                          ? [
                                              ...draft.professorIds,
                                              professor.id,
                                            ]
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

        {error && <p className="text-destructive text-sm">{error}</p>}
        {success && <p className="text-success text-sm">{success}</p>}
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </Form>
      {confirmDeleteGroupId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-lg max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold mb-2">Eliminar grupo</h2>
            <p className="text-muted-foreground mb-6">
              ¿Estás seguro de que querés eliminar este grupo? Esta acción no se
              puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDeleteGroupId(null)}
                className="px-4 py-2 rounded-full border border-border hover:bg-muted transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = confirmDeleteGroupId;
                  setConfirmDeleteGroupId(null);
                  void handleDeleteGroup(id);
                }}
                className="px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
