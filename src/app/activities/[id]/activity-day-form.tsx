'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SPORT_ICONS } from '@/lib/sport-icons';

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
  activityGroupId: string | null;
  sportIcon: string | null;
};

type GroupOption = {
  id: string;
  name: string;
};

interface ActivityDayFormProps {
  activityId: string;
  mode: 'create' | 'edit';
  groups: GroupOption[];
  initialValues?: ActivityDayValues;
  dayId?: string;
  onSaved?: () => void;
  onCancel?: () => void;
  redirectOnSave?: string;
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
  initialValues: ActivityDayValues | undefined
): ActivityDayValues {
  return (
    initialValues ?? {
      date: '',
      schedule: '',
      description: '',
      geoLocation: '',
      coordinates: null,
      activityGroupId: null,
      sportIcon: null,
    }
  );
}

export default function ActivityDayForm({
  activityId,
  mode,
  groups,
  initialValues,
  dayId,
  onSaved,
  onCancel,
  redirectOnSave,
}: ActivityDayFormProps) {
  const router = useRouter();
  const [date, setDate] = useState(
    buildInitialState(initialValues).date
  );
  const [schedule, setSchedule] = useState(
    buildInitialState(initialValues).schedule
  );
  const [description, setDescription] = useState(
    buildInitialState(initialValues).description
  );
  const [geoLocation, setGeoLocation] = useState(
    buildInitialState(initialValues).geoLocation
  );
  const [coordinates, setCoordinates] = useState<Coordinates | null>(
    buildInitialState(initialValues).coordinates
  );
  const [activityGroupId, setActivityGroupId] = useState<string | null>(
    buildInitialState(initialValues).activityGroupId
  );
  const [sportIcon, setSportIcon] = useState<string | null>(
    buildInitialState(initialValues).sportIcon
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
    setActivityGroupId(null);
    setSportIcon(null);
  };

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (!coordinates) {
        throw new Error('Seleccioná un punto en el mapa');
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
            activityGroupId,
            sportIcon: sportIcon || null,
          }),
        }
      );

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo guardar la sesión');
      }

      if (isEdit) {
        if (redirectOnSave) {
          router.push(redirectOnSave);
        } else {
          onSaved?.();
          router.refresh();
        }
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
      <div className="space-y-2">
        <p className="text-sm font-medium">Deporte / ícono</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {SPORT_ICONS.map((icon) => (
            <button
              key={icon.file}
              type="button"
              onClick={() =>
                setSportIcon(sportIcon === icon.file ? null : icon.file)
              }
              className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors ${
                sportIcon === icon.file
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
              title={icon.label}
            >
              <Image
                src={`/icons/${icon.file}`}
                alt={icon.label}
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
              <span className="text-center leading-tight">{icon.label}</span>
            </button>
          ))}
        </div>
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <span className="text-xs text-muted-foreground">
            Guarda fecha, horario, ubicacion, mapa y grupo asignado.
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
