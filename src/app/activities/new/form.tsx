'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
  description: string;
  geoLocation: string;
  coordinates: Coordinates | null;
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
    description: '',
    geoLocation: '',
    coordinates: null,
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
              if (!draft.geoLocation.trim()) {
                throw new Error(
                  `Completá la ubicación de la sesión ${index + 1}`
                );
              }
              if (!draft.coordinates) {
                throw new Error(
                  `Seleccioná un punto en el mapa para la sesión ${index + 1}`
                );
              }

              return {
                weekday: Number(draft.weekday),
                schedule: draft.schedule.trim(),
                description: draft.description.trim() || undefined,
                geoLocation: draft.geoLocation.trim(),
                latitude: draft.coordinates.latitude,
                longitude: draft.coordinates.longitude,
              };
            })
          : [];

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
          annualSchedules: normalizedAnnualSchedules,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo crear la actividad');
      }

      const json = await res.json();

      for (const group of groups) {
        const groupRes = await fetch(`/api/activities/${json.id}/groups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: group.name,
            description: group.description || undefined,
          }),
        });

        if (!groupRes.ok) {
          throw new Error(
            'La actividad se creó, pero falló la creación de grupos'
          );
        }
      }

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
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Sesiones semanales</p>
              <p className="text-xs text-muted-foreground">
                Cada bloque define un día fijo de la semana y se replicará entre
                la fecha de inicio y la fecha de fin.
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

                  <input
                    type="text"
                    placeholder="Nombre o referencia del lugar"
                    value={draft.geoLocation}
                    onChange={(e) =>
                      updateAnnualScheduleDraft(draft.tempId, {
                        geoLocation: e.target.value,
                      })
                    }
                    className={inputClass}
                  />

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Punto en el mapa</p>
                    <LocationMapPicker
                      value={draft.coordinates}
                      onChange={(coordinates) =>
                        updateAnnualScheduleDraft(draft.tempId, {
                          coordinates,
                        })
                      }
                    />
                  </div>

                  <textarea
                    placeholder="Descripción de la sesión (opcional)"
                    value={draft.description}
                    onChange={(e) =>
                      updateAnnualScheduleDraft(draft.tempId, {
                        description: e.target.value,
                      })
                    }
                    className={`${inputClass} min-h-[90px] resize-y`}
                  />
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
