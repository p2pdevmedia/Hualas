'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import ProfessorPicker from '../professor-picker';
import { SPORT_ICONS } from '@/lib/sport-icons';

type ProfessorOption = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
};

type GroupOption = {
  id: string;
  name: string;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

interface BulkSessionCreatorProps {
  activityId: string;
  professors: ProfessorOption[];
  groups: GroupOption[];
  defaultProfessorIds: string[];
  existingDayDates: string[];
  onClose: () => void;
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

const MONTH_NAMES: string[] = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const WEEKDAY_SHORT_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'] as const;

function getCalendarGrid(year: number, month: number): (number | null)[] {
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const lastDay = new Date(year, month + 1, 0).getDate();
  const grid: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= lastDay; d++) grid.push(d);
  return grid;
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function BulkSessionCreator({
  activityId,
  professors,
  groups,
  defaultProfessorIds,
  existingDayDates,
  onClose,
}: BulkSessionCreatorProps) {
  const router = useRouter();

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const maxDate = new Date(todayDate);
  maxDate.setFullYear(maxDate.getFullYear() + 1);

  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [visibleWeekdays, setVisibleWeekdays] = useState<Set<number>>(
    new Set([0, 1, 2, 3, 4, 5, 6])
  );

  const [schedule, setSchedule] = useState('');
  const [geoLocation, setGeoLocation] = useState('');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [professorIds, setProfessorIds] =
    useState<string[]>(defaultProfessorIds);
  const ALL_GROUPS_VALUE = '__all_groups__';
  const [activityGroupId, setActivityGroupId] = useState<string | null>(null);
  const [sportIcon, setSportIcon] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const existingSet = new Set(existingDayDates);
  const activityProfessors = professors.filter((p) =>
    defaultProfessorIds.includes(p.id)
  );

  function toggleDate(dateStr: string, disabled: boolean) {
    if (disabled) return;
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const isFirstMonth =
    viewYear === todayDate.getFullYear() && viewMonth === todayDate.getMonth();
  const isLastMonth =
    viewYear === maxDate.getFullYear() && viewMonth === maxDate.getMonth();

  const calendarGrid = getCalendarGrid(viewYear, viewMonth);
  const weekRows = Array.from(
    { length: Math.ceil(calendarGrid.length / 7) },
    (_, weekIndex) =>
      calendarGrid
        .slice(weekIndex * 7, weekIndex * 7 + 7)
        .concat(
          Array(
            Math.max(
              0,
              7 - calendarGrid.slice(weekIndex * 7, weekIndex * 7 + 7).length
            )
          ).fill(null)
        )
  );
  const weekdayIndexes = [0, 1, 2, 3, 4, 5, 6];
  const visibleWeekdayIndexes = weekdayIndexes.filter((idx) =>
    visibleWeekdays.has(idx)
  );

  function toggleWeekdayColumn(dayIdx: number) {
    setVisibleWeekdays((prev) => {
      if (prev.has(dayIdx) && prev.size === 1) return prev;
      const next = new Set(prev);
      if (next.has(dayIdx)) next.delete(dayIdx);
      else next.add(dayIdx);
      return next;
    });
  }

  async function handleSubmit() {
    if (selectedDates.size === 0) {
      setError('Seleccioná al menos un día.');
      return;
    }
    if (!schedule.trim()) {
      setError('Completá el horario.');
      return;
    }
    if (!geoLocation.trim()) {
      setError('Completá la ubicación.');
      return;
    }
    if (!coordinates) {
      setError('Seleccioná un punto en el mapa.');
      return;
    }
    if (professorIds.length === 0) {
      setError('Seleccioná al menos un profesor.');
      return;
    }

    setError('');
    setSaving(true);

    const dates = Array.from(selectedDates).sort();
    let failCount = 0;

    const targetGroupIds =
      activityGroupId === ALL_GROUPS_VALUE
        ? groups.map((group) => group.id)
        : [activityGroupId];

    for (const dateStr of dates) {
      for (const targetGroupId of targetGroupIds) {
        try {
          const res = await fetch(`/api/activities/${activityId}/days`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: dateStr,
              schedule: schedule.trim(),
              description: description.trim() || undefined,
              geoLocation: geoLocation.trim(),
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              professorIds,
              activityGroupId: targetGroupId,
              sportIcon: sportIcon || null,
            }),
          });
          if (!res.ok) failCount++;
        } catch {
          failCount++;
        }
      }
    }

    setSaving(false);

    if (failCount > 0) {
      setError(
        `${failCount} sesión${failCount !== 1 ? 'es' : ''} no se pudo${failCount !== 1 ? 'ieron' : ''} crear.`
      );
      router.refresh();
    } else {
      onClose();
      router.refresh();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-2xl rounded-xl bg-background shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-heading text-lg font-semibold">
            Crear sesiones múltiples
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xl leading-none text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-4 space-y-6">
          {/* Calendar */}
          <div>
            <p className="mb-3 text-sm font-medium">Seleccioná los días</p>
            <div className="mb-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Mostrar días en la grilla
              </p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_SHORT_NAMES.map((weekday, idx) => {
                  const active = visibleWeekdays.has(idx);
                  return (
                    <button
                      key={weekday}
                      type="button"
                      onClick={() => toggleWeekdayColumn(idx)}
                      className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                        active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {weekday}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                disabled={isFirstMonth}
                className="flex h-8 w-8 items-center justify-center rounded-md border text-sm hover:bg-muted disabled:opacity-40"
              >
                ←
              </button>
              <span className="text-sm font-semibold">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                disabled={isLastMonth}
                className="flex h-8 w-8 items-center justify-center rounded-md border text-sm hover:bg-muted disabled:opacity-40"
              >
                →
              </button>
            </div>

            <div
              className="mb-1 grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${visibleWeekdayIndexes.length}, minmax(0, 1fr))`,
              }}
            >
              {visibleWeekdayIndexes.map((dayIdx) => (
                <div
                  key={dayIdx}
                  className="py-1 text-center text-xs font-medium text-muted-foreground"
                >
                  {WEEKDAY_SHORT_NAMES[dayIdx]}
                </div>
              ))}
            </div>

            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${visibleWeekdayIndexes.length}, minmax(0, 1fr))`,
              }}
            >
              {weekRows.flatMap((week, weekIdx) =>
                visibleWeekdayIndexes.map((weekdayIdx) => {
                  const day = week[weekdayIdx];
                  if (day === null)
                    return <div key={`e-${weekIdx}-${weekdayIdx}`} />;

                  const dateStr = toDateStr(viewYear, viewMonth, day);
                  const dayDate = new Date(viewYear, viewMonth, day);
                  const isPast = dayDate < todayDate;
                  const isBeyond = dayDate > maxDate;
                  const isDisabled = isPast || isBeyond;
                  const isSelected = selectedDates.has(dateStr);
                  const hasSession = existingSet.has(dateStr);

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => toggleDate(dateStr, isDisabled)}
                      className={[
                        'relative flex h-9 w-full items-center justify-center rounded-md text-sm transition-colors',
                        isDisabled
                          ? 'cursor-not-allowed opacity-30'
                          : 'cursor-pointer',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : isDisabled
                            ? ''
                            : 'hover:bg-muted',
                      ].join(' ')}
                    >
                      {day}
                      {hasSession && (
                        <span
                          className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                            isSelected ? 'bg-primary-foreground' : 'bg-primary'
                          }`}
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                {selectedDates.size}{' '}
                {selectedDates.size === 1
                  ? 'día seleccionado'
                  : 'días seleccionados'}
              </span>
              {existingDayDates.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                  Sesión ya existente
                </span>
              )}
            </div>
          </div>

          {/* Session config */}
          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">Configuración compartida</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Horario</label>
                <input
                  type="text"
                  placeholder="ej: 9:00 - 11:00"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Ubicación
                </label>
                <input
                  type="text"
                  placeholder="Nombre o referencia del lugar"
                  value={geoLocation}
                  onChange={(e) => setGeoLocation(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Punto en el mapa</p>
              <LocationMapPicker
                value={coordinates}
                onChange={setCoordinates}
              />
            </div>

            <div className="space-y-1">
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
                  >
                    <Image
                      src={`/icons/${icon.file}`}
                      alt={icon.label}
                      width={40}
                      height={40}
                      className="h-10 w-10 object-contain"
                    />
                    <span className="text-center leading-tight">
                      {icon.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {groups.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Grupo de la sesión</p>
                <select
                  value={activityGroupId ?? ''}
                  onChange={(e) => setActivityGroupId(e.target.value || null)}
                  className={inputClass}
                >
                  <option value="">Sin restricción de grupo</option>
                  <option value={ALL_GROUPS_VALUE}>Todos los grupos</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <ProfessorPicker
              professors={activityProfessors}
              value={professorIds}
              onChange={setProfessorIds}
            />

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Descripción (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${inputClass} min-h-[70px] resize-y`}
                placeholder="Descripción de las sesiones"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t p-4">
          <div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving || selectedDates.size === 0}
            >
              {saving
                ? 'Creando...'
                : selectedDates.size === 0
                  ? 'Seleccioná días'
                  : `Crear ${selectedDates.size} sesión${selectedDates.size !== 1 ? 'es' : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
