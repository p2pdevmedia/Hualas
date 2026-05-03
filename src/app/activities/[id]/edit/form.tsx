'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { SPORT_ICONS } from '@/lib/sport-icons';
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
    capacity?: number | null;
    professorIds: string[];
  };
  annualDefaults?: AnnualSharedDraft;
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
  };
}

export default function EditActivityForm({
  activity,
  annualDefaults,
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
  const [price, setPrice] = useState(String(activity.price));
  const [capacity, setCapacity] = useState(activity.capacity?.toString() ?? '');
  const [professorIds, setProfessorIds] = useState<string[]>(
    activity.professorIds
  );

  const [annualSchedules, setAnnualSchedules] = useState<AnnualScheduleDraft[]>(
    []
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
  const [groupError, setGroupError] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<
    string | null
  >(null);

  const [confirmPending, setConfirmPending] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  function addScheduleDraft() {
    setAnnualSchedules((current) => [...current, createEmptyScheduleDraft()]);
  }

  function updateScheduleDraft(
    tempId: string,
    updates: Partial<AnnualScheduleDraft>
  ) {
    setAnnualSchedules((current) =>
      current.map((d) => (d.tempId === tempId ? { ...d, ...updates } : d))
    );
  }

  function removeScheduleDraft(tempId: string) {
    setAnnualSchedules((current) => current.filter((d) => d.tempId !== tempId));
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    setGroupError('');
    setCreatingGroup(true);
    try {
      const res = await fetch(`/api/activities/${activity.id}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDesc.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('No se pudo crear el grupo');
      const group = await res.json();
      setExistingGroups((current) => [...current, group]);
      setNewGroupName('');
      setNewGroupDesc('');
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
    const willDeleteDays =
      activityType === 'TEMPORARY' ||
      (activityType === 'ANNUAL' && annualSchedules.length > 0) ||
      (activityType === 'ANNUAL' &&
        annualSchedules.length === 0 &&
        existingDayCount > 0);

    if (!willDeleteDays || existingDayCount === 0) return null;

    if (activityType === 'TEMPORARY') {
      return `Esta acción borrará las ${existingDayCount} sesiones existentes de la actividad al cambiarla a Temporal. ¿Confirmás?`;
    }

    if (annualSchedules.length === 0) {
      return `Esta acción actualizará las ${existingDayCount} sesiones existentes con la ubicación, el deporte y la descripción compartidos. ¿Confirmás?`;
    }

    return `Esta acción borrará las ${existingDayCount} sesiones existentes y creará nuevas según la configuración indicada. ¿Confirmás?`;
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

      for (let i = 0; i < annualSchedules.length; i++) {
        const draft = annualSchedules[i];
        if (!draft.schedule.trim()) {
          setError(`Completá el horario de la sesión ${i + 1}`);
          return;
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
      const normalizedSchedules =
        activityType === 'ANNUAL'
          ? annualSchedules.map((d) => ({
              tempId: d.tempId,
              weekday: Number(d.weekday),
              schedule: d.schedule.trim(),
              groupId: d.groupId || undefined,
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
          price: Number(price),
          capacity: capacity ? Number(capacity) : undefined,
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
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="number"
            placeholder="Precio"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
            min={0}
            required
          />
          <input
            type="number"
            min={1}
            placeholder="Cupo de inscripciones (opcional)"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-3 rounded-lg border bg-background p-4">
          <p className="text-sm font-semibold">Grupos</p>

          {existingGroups.length > 0 ? (
            <ul className="space-y-2">
              {existingGroups.map((group) => (
                <li
                  key={group.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>
                    {group.name}
                    {group.description && (
                      <span className="ml-2 text-muted-foreground">
                        — {group.description}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    disabled={deletingGroupId === group.id}
                    onClick={() => setConfirmDeleteGroupId(group.id)}
                    className="ml-4 text-xs text-destructive hover:text-destructive/80 disabled:opacity-50"
                  >
                    {deletingGroupId === group.id
                      ? 'Eliminando...'
                      : 'Eliminar'}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Sin grupos todavía.</p>
          )}

          <div className="grid gap-2 items-end sm:grid-cols-[1fr_1fr_auto]">
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

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Sesiones semanales</p>
                <p className="text-xs text-muted-foreground">
                  Configurá las sesiones para regenerarlas. Si no agregás
                  ninguna, se conservarán los horarios y grupos actuales, pero
                  se actualizarán la ubicación, el deporte y la descripción
                  compartidos.
                  {existingDayCount > 0 && (
                    <span className="ml-1 font-medium text-amber-600">
                      Hay {existingDayCount} sesiones existentes.
                    </span>
                  )}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addScheduleDraft}
              >
                Agregar sesión
              </Button>
            </div>

            {annualSchedules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay sesiones nuevas configuradas.
              </p>
            ) : (
              <div className="space-y-4">
                {annualSchedules.map((draft, index) => (
                  <div
                    key={draft.tempId}
                    className="space-y-3 rounded-lg border p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium">Sesión {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeScheduleDraft(draft.tempId)}
                        className="text-xs text-destructive hover:text-destructive/80"
                      >
                        Quitar
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <select
                        value={draft.weekday}
                        onChange={(e) =>
                          updateScheduleDraft(draft.tempId, {
                            weekday: e.target.value,
                          })
                        }
                        className={inputClass}
                      >
                        {WEEKDAY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
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
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">Grupo</label>
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
                    </div>
                  </div>
                ))}
              </div>
            )}
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
