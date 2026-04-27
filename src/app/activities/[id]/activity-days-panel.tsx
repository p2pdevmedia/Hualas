'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type AttendanceStatus = 'PENDING' | 'GOING' | 'NOT_GOING';

type Registration = {
  id: string;
  label: string;
};

type ActivityDay = {
  id: string;
  date: string;
  schedule: string;
  description: string | null;
  geoLocation: string;
  latitude: number | null;
  longitude: number | null;
  attendances: Array<{
    activityParticipantId: string;
    status: AttendanceStatus;
    confirmedAt: string | null;
  }>;
};

interface ActivityDaysPanelProps {
  activityId: string;
  canManageDays: boolean;
  registrations: Registration[];
  days: ActivityDay[];
}

const statusLabels: Record<AttendanceStatus, string> = {
  PENDING: 'Pendiente',
  GOING: 'Voy',
  NOT_GOING: 'No voy',
};

const LocationMapPicker = dynamic(() => import('../location-map-picker'), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center rounded-lg border bg-muted/20 text-sm text-muted-foreground">
      Cargando mapa...
    </div>
  ),
});

export default function ActivityDaysPanel({
  activityId,
  canManageDays,
  registrations,
  days,
}: ActivityDaysPanelProps) {
  const router = useRouter();
  const [date, setDate] = useState('');
  const [schedule, setSchedule] = useState('');
  const [description, setDescription] = useState('');
  const [geoLocation, setGeoLocation] = useState('');
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  async function createDay(e: React.FormEvent) {
    e.preventDefault();
    setSaveError('');
    try {
      if (!coordinates) {
        throw new Error('Seleccioná un punto en el mapa');
      }
      const res = await fetch(`/api/activities/${activityId}/days`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          schedule,
          description: description || undefined,
          geoLocation,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo crear el día');
      }
      setDate('');
      setSchedule('');
      setDescription('');
      setGeoLocation('');
      setCoordinates(null);
      router.refresh();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'No se pudo crear el día'
      );
    }
  }

  async function updateAttendance(
    dayId: string,
    participantId: string,
    status: AttendanceStatus
  ) {
    const key = `${dayId}:${participantId}`;
    setError('');
    setSavingKey(key);
    try {
      const res = await fetch(`/api/activity-days/${dayId}/attendance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, status }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(
          payload?.error || 'No se pudo actualizar la asistencia'
        );
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar la asistencia'
      );
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <section className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold">
            Días de la actividad
          </h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            El profesor puede programar días y los inscriptos confirman si van a
            asistir.
          </p>
        </div>
        {canManageDays && (
          <div className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
            Administración de días
          </div>
        )}
      </div>

      {canManageDays && (
        <form
          onSubmit={createDay}
          className="mt-5 space-y-3 rounded-lg border bg-background p-4"
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
            placeholder="Descripción del día"
          />
          <div className="flex items-center justify-between gap-3">
            {saveError ? (
              <p className="text-sm text-destructive">{saveError}</p>
            ) : (
              <span className="text-xs text-muted-foreground">
                Guardá una fecha, horario y ubicación para el próximo encuentro.
              </span>
            )}
            <Button type="submit">Agregar día</Button>
          </div>
        </form>
      )}

      {days.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground font-body">
          Aún no hay días cargados para esta actividad.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {days.map((day) => {
            const goingCount = day.attendances.filter(
              (attendance) => attendance.status === 'GOING'
            ).length;
            const notGoingCount = day.attendances.filter(
              (attendance) => attendance.status === 'NOT_GOING'
            ).length;
            const mapHref =
              day.latitude != null && day.longitude != null
                ? `https://www.openstreetmap.org/?mlat=${day.latitude}&mlon=${day.longitude}#map=17/${day.latitude}/${day.longitude}`
                : null;

            return (
              <article
                key={day.id}
                className="rounded-lg border bg-background p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">
                      {new Date(day.date).toLocaleDateString('es-AR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {day.schedule} · {day.geoLocation}
                    </p>
                    {mapHref && (
                      <a
                        href={mapHref}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-primary hover:underline underline-offset-4"
                      >
                        Abrir en OpenStreetMap
                      </a>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {goingCount} confirmados · {notGoingCount} no asistirán
                  </div>
                </div>

                {day.description && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {day.description}
                  </p>
                )}

                {registrations.length > 0 && (
                  <div className="mt-4 space-y-3 border-t pt-4">
                    <p className="text-sm font-semibold">
                      Confirmación de asistencia
                    </p>
                    <div className="space-y-3">
                      {registrations.map((registration) => {
                        const currentAttendance = day.attendances.find(
                          (attendance) =>
                            attendance.activityParticipantId === registration.id
                        );
                        const currentStatus =
                          currentAttendance?.status ?? 'PENDING';
                        const key = `${day.id}:${registration.id}`;
                        const isSaving = savingKey === key;

                        return (
                          <div
                            key={registration.id}
                            className="rounded-md border bg-card p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium">
                                  {registration.label}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Estado actual: {statusLabels[currentStatus]}
                                </p>
                              </div>
                              {isSaving && (
                                <span className="text-xs text-muted-foreground">
                                  Guardando...
                                </span>
                              )}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {(
                                [
                                  'GOING',
                                  'NOT_GOING',
                                  'PENDING',
                                ] as AttendanceStatus[]
                              ).map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() =>
                                    updateAttendance(
                                      day.id,
                                      registration.id,
                                      status
                                    )
                                  }
                                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                                    currentStatus === status
                                      ? 'bg-primary text-primary-foreground'
                                      : 'border border-border bg-background text-foreground hover:bg-muted'
                                  }`}
                                >
                                  {statusLabels[status]}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </section>
  );
}
