'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  PencilLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import BulkSessionCreator from './bulk-session-creator';
import ActivityCalendar, {
  type CalendarActivityDay,
} from '@/app/my-activities/activity-calendar';
import { SPORT_ICONS } from '@/lib/sport-icons';

const LocationMapPicker = dynamic(() => import('../location-map-picker'), {
  ssr: false,
  loading: () => (
    <div className="flex h-56 items-center justify-center rounded-lg border bg-muted/20 text-sm text-muted-foreground">
      Cargando mapa...
    </div>
  ),
});

type ProfessorOption = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
};

type Registration = {
  id: string;
  label: string;
  groupId: string | null;
  groupName: string | null;
};

type GroupOption = {
  id: string;
  name: string;
  capacity: number | null;
};

type ActivityDay = {
  id: string;
  date: string;
  schedule: string;
  description: string | null;
  geoLocation: string;
  latitude: number | null;
  longitude: number | null;
  activityGroupId: string | null;
  sportIcon: string | null;
  activityGroup: {
    id: string;
    name: string;
  } | null;
  assignedProfessors: ProfessorOption[];
  canEdit: boolean;
  canEditDescription: boolean;
  attendances: Array<{
    activityParticipantId: string;
    status: string;
    confirmedAt: string | null;
  }>;
  attendanceList: unknown[];
  pickupNotices: unknown[];
};

interface ActivityDaysPanelProps {
  activityId: string;
  isTemporaryActivity: boolean;
  canManageDays: boolean;
  hideSessionDetails?: boolean;
  hideSessionList?: boolean;
  canOpenSessionDetails?: boolean;
  professors: ProfessorOption[];
  groups: GroupOption[];
  defaultProfessorIds: string[];
  registrations: Registration[];
  days: ActivityDay[];
}

const WEEKDAY_LABELS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export default function ActivityDaysPanel({
  activityId,
  isTemporaryActivity,
  canManageDays,
  hideSessionDetails = false,
  canOpenSessionDetails = false,
  professors,
  groups,
  defaultProfessorIds,
  registrations,
  days,
}: ActivityDaysPanelProps) {
  const router = useRouter();
  const [showBulkCreator, setShowBulkCreator] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showWeeklyPlanner, setShowWeeklyPlanner] = useState(false);
  const [showQuickDeleteTab, setShowQuickDeleteTab] = useState(false);
  const [selectedDayIds, setSelectedDayIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [quickSportIcon, setQuickSportIcon] = useState<string | null>(null);
  const [quickGeoLocation, setQuickGeoLocation] = useState('');
  const [quickCoordinates, setQuickCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [selectedActivityWeekIndex, setSelectedActivityWeekIndex] = useState(0);
  const capacity =
    groups.length === 0 || groups.some((group) => group.capacity == null)
      ? null
      : groups.reduce((sum, group) => sum + (group.capacity ?? 0), 0);
  const enrolledCount = registrations.length;

  const calendarDays: CalendarActivityDay[] = days.map((day) => ({
    id: day.id,
    date: day.date.slice(0, 10),
    activityId,
    activityName: 'Actividad',
    schedule: day.schedule,
    geoLocation: day.geoLocation,
    description: day.description,
    sportIcon: day.sportIcon,
    latitude: day.latitude,
    longitude: day.longitude,
    cancelled: false,
    activityGroupName: day.activityGroup?.name ?? null,
    professors: day.assignedProfessors.map((professor) => ({
      id: professor.id,
      label: `${professor.name ?? 'Sin nombre'}${professor.lastName ? ` ${professor.lastName}` : ''}`,
      phone: professor.phone,
    })),
    capacity,
    enrolledCount,
  }));

  const existingDayDates = days.map((day) => day.date.slice(0, 10));

  const selectedCount = selectedDayIds.length;
  const sortedDays = useMemo(
    () =>
      [...days].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [days]
  );

  const getWeekStart = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setDate(date.getDate() + mondayOffset);
    return start;
  };

  const toggleDaySelection = (dayId: string) => {
    setSelectedDayIds((current) =>
      current.includes(dayId)
        ? current.filter((id) => id !== dayId)
        : [...current, dayId]
    );
  };

  const clearSelection = () => setSelectedDayIds([]);

  const handleDeleteSelectedDays = async () => {
    if (selectedDayIds.length === 0 || isDeleting) return;

    const confirmed = window.confirm(
      `¿Eliminar ${selectedDayIds.length} sesión${selectedDayIds.length !== 1 ? 'es' : ''}? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    setDeleteError(null);

    try {
      setIsDeleting(true);
      const [firstDayId] = selectedDayIds;
      const res = await fetch(`/api/activity-days/${firstDayId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedDayIds }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(
          payload?.error ?? 'No se pudieron eliminar las sesiones'
        );
      }

      setSelectedDayIds([]);
      router.refresh();
    } catch (error) {
      console.error(error);
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'No se pudieron eliminar las sesiones'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const editingDay = editingDayId
    ? (days.find((day) => day.id === editingDayId) ?? null)
    : null;

  const openQuickEditor = (day: ActivityDay) => {
    setEditingDayId(day.id);
    setQuickSportIcon(day.sportIcon);
    setQuickGeoLocation(day.geoLocation);
    if (day.latitude != null && day.longitude != null) {
      setQuickCoordinates({ latitude: day.latitude, longitude: day.longitude });
    } else {
      setQuickCoordinates(null);
    }
    setQuickError(null);
  };

  const closeQuickEditor = () => {
    if (quickSaving) return;
    setEditingDayId(null);
    setQuickError(null);
  };

  const handleQuickSave = async () => {
    if (!editingDay) return;
    if (!quickGeoLocation.trim()) {
      setQuickError('Completá la ubicación.');
      return;
    }
    if (!quickCoordinates) {
      setQuickError('Seleccioná un punto en el mapa.');
      return;
    }

    try {
      setQuickSaving(true);
      setQuickError(null);
      const response = await fetch(`/api/activity-days/${editingDay.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: editingDay.date.slice(0, 10),
          schedule: editingDay.schedule,
          description: editingDay.description ?? undefined,
          geoLocation: quickGeoLocation.trim(),
          latitude: quickCoordinates.latitude,
          longitude: quickCoordinates.longitude,
          professorIds: editingDay.assignedProfessors.map(
            (professor) => professor.id
          ),
          activityGroupId: editingDay.activityGroupId,
          sportIcon: quickSportIcon,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'No se pudieron guardar los cambios');
      }

      setEditingDayId(null);
      router.refresh();
    } catch (error) {
      setQuickError(
        error instanceof Error
          ? error.message
          : 'No se pudieron guardar los cambios'
      );
    } finally {
      setQuickSaving(false);
    }
  };

  const activityWeeks = useMemo(() => {
    const weekMap = new Map<string, { key: string; start: Date }>();
    sortedDays.forEach((day) => {
      const weekStart = getWeekStart(day.date);
      const key = weekStart.toISOString().slice(0, 10);
      if (!weekMap.has(key)) {
        weekMap.set(key, { key, start: weekStart });
      }
    });
    return Array.from(weekMap.values()).sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    );
  }, [sortedDays]);

  useEffect(() => {
    if (activityWeeks.length === 0) return;
    const todayWeekStartKey = getWeekStart(
      new Date().toISOString()
    ).toISOString();
    const nextWeekIndex = activityWeeks.findIndex(
      (week) => week.start.toISOString() >= todayWeekStartKey
    );
    if (nextWeekIndex > 0) {
      setSelectedActivityWeekIndex(nextWeekIndex);
    }
  }, [activityWeeks]);

  const selectedWeek = activityWeeks[selectedActivityWeekIndex] ?? null;
  const weekDays = useMemo(() => {
    if (selectedWeek == null) return [];
    return days.filter((day) => {
      const dayWeekKey = getWeekStart(day.date).toISOString().slice(0, 10);
      return dayWeekKey === selectedWeek.key;
    });
  }, [days, selectedWeek]);

  const weeklyGrid = useMemo(() => {
    const activeWeekdayIndexes = Array.from(
      new Set(weekDays.map((day) => new Date(day.date).getDay()))
    ).sort((a, b) => a - b);

    return activeWeekdayIndexes.map((weekdayIndex) => {
      const weekdayLabel = WEEKDAY_LABELS[weekdayIndex] ?? 'Día';
      const perGroup = groups.map((group) => {
        const match = weekDays.find((day) => {
          if (day.activityGroupId !== group.id) return false;
          return new Date(day.date).getDay() === weekdayIndex;
        });
        return { group, day: match ?? null };
      });

      return {
        weekdayLabel,
        perGroup,
      };
    });
  }, [groups, weekDays]);

  const selectedWeekLabel =
    selectedWeek == null
      ? 'Sin semanas con actividad'
      : `${selectedWeek.start.toLocaleDateString('es-AR')} - ${new Date(
          selectedWeek.start.getTime() + 6 * 24 * 60 * 60 * 1000
        ).toLocaleDateString('es-AR')}`;

  return (
    <>
      {showBulkCreator && (
        <BulkSessionCreator
          activityId={activityId}
          professors={professors}
          groups={groups}
          defaultProfessorIds={defaultProfessorIds}
          existingDayDates={existingDayDates}
          onClose={() => setShowBulkCreator(false)}
        />
      )}

      {editingDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-background p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold">
                Editar deporte y punto de encuentro
              </h4>
              <button
                type="button"
                onClick={closeQuickEditor}
                className="text-muted-foreground"
              >
                ✕
              </button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              {new Date(editingDay.date).toLocaleDateString('es-AR')} ·{' '}
              {editingDay.activityGroup?.name ?? 'Sin grupo'}{' '}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Lugar</label>
                <input
                  value={quickGeoLocation}
                  onChange={(e) => setQuickGeoLocation(e.target.value)}
                  className="mb-3 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Nombre o referencia del lugar"
                />
                <label className="mb-2 block text-sm font-medium">
                  Deporte
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {SPORT_ICONS.map((icon) => (
                    <button
                      key={icon.file}
                      type="button"
                      onClick={() =>
                        setQuickSportIcon((prev) =>
                          prev === icon.file ? null : icon.file
                        )
                      }
                      className={`rounded-md border p-1 text-[11px] ${quickSportIcon === icon.file ? 'border-primary bg-primary/10' : 'border-border'}`}
                    >
                      <Image
                        src={`/icons/${icon.file}`}
                        alt={icon.label}
                        width={28}
                        height={28}
                        className="mx-auto h-7 w-7 object-contain"
                      />
                      <span>{icon.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4" /> Punto en mapa
                </div>
                <LocationMapPicker
                  value={quickCoordinates}
                  onChange={setQuickCoordinates}
                />
              </div>
            </div>
            {quickError && (
              <p className="mt-2 text-sm text-destructive">{quickError}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeQuickEditor}
                disabled={quickSaving}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void handleQuickSave()}
                disabled={quickSaving}
              >
                {quickSaving ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <section className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-semibold">
              Días de la actividad
            </h2>
            {!hideSessionDetails && (
              <p className="mt-1 text-sm text-muted-foreground font-body">
                El profesor puede programar días y los inscriptos confirman si
                van a asistir.
              </p>
            )}
          </div>
          {canManageDays && (
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <div className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                Administración de días
              </div>

              {days.length > 0 && (
                <div className="w-full rounded-lg border bg-muted/20 p-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-left"
                    onClick={() => setShowQuickDeleteTab((current) => !current)}
                    aria-expanded={showQuickDeleteTab}
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      Selección rápida para borrar varias sesiones
                    </p>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${showQuickDeleteTab ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {showQuickDeleteTab && (
                    <>
                      <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md border bg-background p-2">
                        {sortedDays.map((day) => {
                          const dateLabel = new Date(
                            day.date
                          ).toLocaleDateString('es-AR', {
                            weekday: 'short',
                            day: '2-digit',
                            month: '2-digit',
                          });
                          return (
                            <label
                              key={day.id}
                              className="flex cursor-pointer items-center justify-between gap-3 rounded px-2 py-1 hover:bg-muted/40"
                            >
                              <span className="text-sm">
                                {dateLabel} · {day.schedule}
                              </span>
                              <input
                                type="checkbox"
                                checked={selectedDayIds.includes(day.id)}
                                onChange={() => toggleDaySelection(day.id)}
                              />
                            </label>
                          );
                        })}
                      </div>
                      {deleteError && (
                        <p className="mt-2 text-xs text-destructive">
                          {deleteError}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {selectedCount} seleccionada
                          {selectedCount === 1 ? '' : 's'}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="px-3 py-1 text-xs"
                            onClick={clearSelection}
                            disabled={selectedCount === 0 || isDeleting}
                          >
                            Limpiar
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            className="px-3 py-1 text-xs"
                            onClick={handleDeleteSelectedDays}
                            disabled={selectedCount === 0 || isDeleting}
                          >
                            {isDeleting
                              ? 'Eliminando…'
                              : 'Eliminar seleccionadas'}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {!hideSessionDetails && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBulkCreator(true)}
                >
                  Crear sesiones
                </Button>
              )}
            </div>
          )}
        </div>

        {days.length > 0 ? (
          <div className="mt-6 space-y-4">
            <button
              type="button"
              onClick={() => setShowCalendar((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
              aria-expanded={showCalendar}
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Calendario
            </button>

            {showCalendar && (
              <ActivityCalendar
                activityDays={calendarDays}
                enableSessionDetailLinks={canOpenSessionDetails}
                sessionDetailLabel="Ver sesión"
                onEdit={
                  canManageDays
                    ? (dayId) =>
                        router.push(
                          `/activities/${activityId}/days/${dayId}/edit`
                        )
                    : undefined
                }
              />
            )}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground font-body">
            Aún no hay días cargados para esta actividad.
          </p>
        )}

        {canManageDays && isTemporaryActivity && groups.length > 0 && (
          <div className="mt-8 rounded-lg border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowWeeklyPlanner((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                  aria-expanded={showWeeklyPlanner}
                >
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  Planificar semana
                </button>
                <span className="text-sm text-muted-foreground">
                  {selectedWeekLabel}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-9 p-0"
                  onClick={() =>
                    setSelectedActivityWeekIndex((current) =>
                      Math.max(0, current - 1)
                    )
                  }
                  disabled={selectedActivityWeekIndex === 0}
                  aria-label="Semana anterior con actividad"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-9 p-0"
                  onClick={() =>
                    setSelectedActivityWeekIndex((current) =>
                      Math.min(activityWeeks.length - 1, current + 1)
                    )
                  }
                  disabled={
                    activityWeeks.length === 0 ||
                    selectedActivityWeekIndex >= activityWeeks.length - 1
                  }
                  aria-label="Siguiente semana con actividad"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {showWeeklyPlanner && (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Definí por grupo y día el lugar y deporte desde cada sesión.
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[800px] border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="border bg-background p-2 text-left">
                          Día
                        </th>
                        {groups.map((group) => (
                          <th
                            key={group.id}
                            className="border bg-background p-2 text-left"
                          >
                            {group.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyGrid.map((row) => (
                        <tr key={row.weekdayLabel}>
                          <td className="border p-2 font-medium">
                            {row.weekdayLabel}
                          </td>
                          {row.perGroup.map(({ group, day }) => (
                            <td key={group.id} className="border p-2 align-top">
                              {day ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    {day.sportIcon ? (
                                      <Image
                                        src={`/sports/${day.sportIcon}`}
                                        alt="Icono de deporte"
                                        width={24}
                                        height={24}
                                        className="h-6 w-6 object-contain"
                                      />
                                    ) : null}
                                    <p>{day.geoLocation}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="px-3 py-1 text-xs"
                                      onClick={() => openQuickEditor(day)}
                                    >
                                      <PencilLine className="mr-1 h-3.5 w-3.5" />
                                      Editar deporte y punto
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-muted-foreground">
                                  Sin sesión para este cruce.
                                </p>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {weeklyGrid.length === 0 && (
                        <tr>
                          <td
                            className="border p-3 text-muted-foreground"
                            colSpan={groups.length + 1}
                          >
                            No hay sesiones para esta semana.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </>
  );
}
