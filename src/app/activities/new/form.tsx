'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SPORT_ICONS } from '@/lib/sport-icons';
import ProfessorPicker from '../professor-picker';

type ProfessorOption = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
};

type GroupDraft = { tempId: string; name: string; description: string };

type Coordinates = {
  latitude: number;
  longitude: number;
};

type AnnualScheduleDraft = {
  tempId: string;
  weekday: string;
  schedule: string;
  groupTempId: string;
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
  const [capacity, setCapacity] = useState('');
  const [professorIds, setProfessorIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<GroupDraft[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [annualSchedules, setAnnualSchedules] = useState<AnnualScheduleDraft[]>(
    []
  );
  const [annualShared, setAnnualShared] = useState<AnnualSharedDraft>({
    geoLocation: '',
    coordinates: null,
    sportIcon: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  function addGroupDraft() {
    if (!newGroupName.trim()) return;
    setGroups((current) => [
      ...current,
      {
        tempId: crypto.randomUUID(),
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
      },
    ]);
    setNewGroupName('');
    setNewGroupDesc('');
  }

  function removeGroupDraft(tempId: string) {
    setGroups((current) => current.filter((group) => group.tempId !== tempId));
  }

  function addAnnualScheduleDraft() {
    setAnnualSchedules((current) => [
      ...current,
      createEmptyAnnualScheduleDraft(),
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

  function resetForm() {
    setName('');
    setDate('');
    setEndDate('');
    setActivityType('TEMPORARY');
    setDescription('');
    setPrice('');
    setCapacity('');
    setProfessorIds([]);
    setGroups([]);
    setNewGroupName('');
    setNewGroupDesc('');
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

              return {
                tempId: draft.tempId,
                weekday: Number(draft.weekday),
                schedule: draft.schedule.trim(),
                groupTempId: draft.groupTempId || undefined,
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
          price: Number(price),
          capacity: capacity ? Number(capacity) : undefined,
          professorIds,
          groups: groups.map((group) => ({
            tempId: group.tempId,
            name: group.name,
            description: group.description || undefined,
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

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Sesiones semanales</p>
              <p className="text-xs text-muted-foreground">
                Cada bloque define un día fijo de la semana, un horario y un
                grupo. La ubicación, el deporte y la descripción son comunes a
                todas las sesiones.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addAnnualScheduleDraft}
            >
              Agregar sesión
            </Button>
          </div>

          {annualSchedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay sesiones cargadas todavía.
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
                      onClick={() => removeAnnualScheduleDraft(draft.tempId)}
                      className="text-xs text-destructive hover:text-destructive/80"
                    >
                      Quitar
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      value={draft.weekday}
                      onChange={(e) =>
                        updateAnnualScheduleDraft(draft.tempId, {
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
                        updateAnnualScheduleDraft(draft.tempId, {
                          schedule: e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Grupo</label>
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

        <div className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
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
          <Button type="button" variant="outline" onClick={addGroupDraft}>
            Agregar
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar'}
      </Button>
    </form>
  );
}
