'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import ProfessorPicker from '../professor-picker';

type ProfessorOption = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type ActivityDayValues = {
  date: string;
  schedule: string;
  description: string;
  geoLocation: string;
  coordinates: Coordinates | null;
  professorIds: string[];
  activityGroupId: string | null;
};

type GroupOption = {
  id: string;
  name: string;
};

interface ActivityDayFormProps {
  activityId: string;
  mode: 'create' | 'edit';
  professors: ProfessorOption[];
  groups: GroupOption[];
  defaultProfessorIds: string[];
  initialValues?: ActivityDayValues;
  dayId?: string;
  onSaved?: () => void;
  onCancel?: () => void;
}

const LocationMapPicker = dynamic(() => import('../location-map-picker'), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center rounded-lg border bg-muted/20 text-sm text-muted-foreground">
      Cargando mapa...
    </div>
  ),
});

const inputClass =
  'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

function buildInitialState(
  initialValues: ActivityDayValues | undefined,
  defaultProfessorIds: string[]
): ActivityDayValues {
  return (
    initialValues ?? {
      date: '',
      schedule: '',
      description: '',
      geoLocation: '',
      coordinates: null,
      professorIds: defaultProfessorIds,
      activityGroupId: null,
    }
  );
}

export default function ActivityDayForm({
  activityId,
  mode,
  professors,
  groups,
  defaultProfessorIds,
  initialValues,
  dayId,
  onSaved,
  onCancel,
}: ActivityDayFormProps) {
  const router = useRouter();
  const [date, setDate] = useState(
    buildInitialState(initialValues, defaultProfessorIds).date
  );
  const [schedule, setSchedule] = useState(
    buildInitialState(initialValues, defaultProfessorIds).schedule
  );
  const [description, setDescription] = useState(
    buildInitialState(initialValues, defaultProfessorIds).description
  );
  const [geoLocation, setGeoLocation] = useState(
    buildInitialState(initialValues, defaultProfessorIds).geoLocation
  );
  const [coordinates, setCoordinates] = useState<Coordinates | null>(
    buildInitialState(initialValues, defaultProfessorIds).coordinates
  );
  const [professorIds, setProfessorIds] = useState<string[]>(
    buildInitialState(initialValues, defaultProfessorIds).professorIds
  );
  const [activityGroupId, setActivityGroupId] = useState<string | null>(
    buildInitialState(initialValues, defaultProfessorIds).activityGroupId
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isEdit = mode === 'edit';

  const resetCreateForm = () => {
    setDate('');
    setSchedule('');
    setDescription('');
    setGeoLocation('');
    setCoordinates(null);
    setProfessorIds(defaultProfessorIds);
    setActivityGroupId(null);
  };

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (!coordinates) {
        throw new Error('Seleccioná un punto en el mapa');
      }
      if (professorIds.length === 0) {
        throw new Error('Seleccioná al menos un profesor');
      }

      const res = await fetch(
        isEdit && dayId
          ? `/api/activity-days/${dayId}`
          : `/api/activities/${activityId}/days`,
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date,
            schedule,
            description: description || undefined,
            geoLocation,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            professorIds,
            activityGroupId,
          }),
        }
      );

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo guardar la sesión');
      }

      if (isEdit) {
        onSaved?.();
        router.refresh();
        return;
      }

      resetCreateForm();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo guardar la sesión'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submitForm}
      className="space-y-3 rounded-lg border bg-background p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
          required
        />
        <input
          type="text"
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          className={inputClass}
          placeholder="Horario"
          required
        />
      </div>
      <input
        type="text"
        value={geoLocation}
        onChange={(e) => setGeoLocation(e.target.value)}
        className={inputClass}
        placeholder="Nombre o referencia del lugar"
        required
      />
      <div className="space-y-2">
        <p className="text-sm font-medium">Punto en el mapa</p>
        <LocationMapPicker value={coordinates} onChange={setCoordinates} />
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className={`${inputClass} min-h-[90px] resize-y`}
        placeholder="Descripción de la sesión"
      />
      <div className="space-y-1">
        <p className="text-sm font-medium">Grupo de la sesión</p>
        <select
          value={activityGroupId ?? ''}
          onChange={(e) =>
            setActivityGroupId(e.target.value ? e.target.value : null)
          }
          className={inputClass}
        >
          <option value="">Sin restricción de grupo</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>
      <ProfessorPicker
        professors={professors}
        value={professorIds}
        onChange={setProfessorIds}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <span className="text-xs text-muted-foreground">
            Guardá fecha, horario, ubicación, mapa, grupo y profesores
            asignados.
          </span>
        )}
        <div className="flex gap-2">
          {isEdit && onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={saving}>
            {saving
              ? 'Guardando...'
              : isEdit
                ? 'Guardar cambios'
                : 'Agregar día'}
          </Button>
        </div>
      </div>
    </form>
  );
}
