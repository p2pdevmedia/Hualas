'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';

type Group = {
  id: string;
  name: string;
  minAge: number | null;
  maxAge: number | null;
  professors: string[];
};
type Session = {
  id: string;
  date: string;
  schedule: string;
  activityGroupId: string | null;
  sportIcon: string | null;
};

type Props = {
  activityType: 'ANNUAL' | 'TEMPORARY' | 'EVENTUAL';
  groups: Group[];
  sessions: Session[];
  selectedGroupId: string;
  selectedSessionId?: string;
  onGroupChange: (value: string) => void;
  onSessionChange?: (value: string) => void;
  selectedPersonBirthDate?: string | null;
  selectedPersonAge?: number | null;
  isPersonSelected?: boolean;
  activityStartDate?: string | null;
};

const weekdayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const longWeekdayLabels = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
];

const GROUP_COLORS = [
  {
    pill: 'bg-blue-100 border-blue-300 text-blue-800',
    pillSelected: 'bg-blue-500 border-blue-600 text-white',
    slot: 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100',
    slotSelected: 'bg-blue-500 border-blue-600 text-white',
  },
  {
    pill: 'bg-emerald-100 border-emerald-300 text-emerald-800',
    pillSelected: 'bg-emerald-500 border-emerald-600 text-white',
    slot: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100',
    slotSelected: 'bg-emerald-500 border-emerald-600 text-white',
  },
  {
    pill: 'bg-violet-100 border-violet-300 text-violet-800',
    pillSelected: 'bg-violet-500 border-violet-600 text-white',
    slot: 'bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100',
    slotSelected: 'bg-violet-500 border-violet-600 text-white',
  },
  {
    pill: 'bg-amber-100 border-amber-300 text-amber-800',
    pillSelected: 'bg-amber-500 border-amber-600 text-white',
    slot: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100',
    slotSelected: 'bg-amber-500 border-amber-600 text-white',
  },
  {
    pill: 'bg-rose-100 border-rose-300 text-rose-800',
    pillSelected: 'bg-rose-500 border-rose-600 text-white',
    slot: 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100',
    slotSelected: 'bg-rose-500 border-rose-600 text-white',
  },
];

function getWeekStartMonday(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function calculateAge(birthDate: Date, referenceDate: Date): number {
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const m = referenceDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function getDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

function getMondayWeekdayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

function formatAgeRange(group: Group) {
  if (group.minAge === null && group.maxAge === null) return 'Todas las edades';
  if (group.minAge !== null && group.maxAge !== null) {
    return `${group.minAge} a ${group.maxAge} años`;
  }
  if (group.minAge !== null) return `Desde ${group.minAge} años`;
  return `Hasta ${group.maxAge} años`;
}

function formatSessionDate(date: Date) {
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

export default function GroupScheduleCalendar({
  activityType,
  groups,
  sessions,
  selectedGroupId,
  selectedSessionId,
  onGroupChange,
  onSessionChange,
  selectedPersonBirthDate,
  selectedPersonAge,
  isPersonSelected = false,
  activityStartDate,
}: Props) {
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const groupColorMap = useMemo(() => {
    const map = new Map<string, (typeof GROUP_COLORS)[number]>();
    groups.forEach((g, i) =>
      map.set(g.id, GROUP_COLORS[i % GROUP_COLORS.length])
    );
    return map;
  }, [groups]);

  const weeklyDays = useMemo(() => {
    const start = getWeekStartMonday(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const monthlyDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = getWeekStartMonday(new Date(year, month, 1));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const session of sessions) {
      const key = getDateKey(session.date);
      const list = map.get(key) ?? [];
      list.push(session);
      map.set(key, list);
    }
    return map;
  }, [sessions]);

  const ageWarning = useMemo(() => {
    if (!selectedGroupId || !selectedPersonBirthDate) return null;
    const group = groups.find((g) => g.id === selectedGroupId);
    if (!group || (group.minAge === null && group.maxAge === null)) return null;
    const birthDate = new Date(selectedPersonBirthDate);
    const today = new Date();
    const actStart = activityStartDate ? new Date(activityStartDate) : null;
    const refDate = actStart && actStart > today ? actStart : today;
    const age = calculateAge(birthDate, refDate);
    if (group.minAge !== null && age < group.minAge) {
      return `La persona seleccionada tiene ${age} año${age === 1 ? '' : 's'}. Este grupo es para mayores de ${group.minAge} años.`;
    }
    if (group.maxAge !== null && age > group.maxAge) {
      return `La persona seleccionada tiene ${age} año${age === 1 ? '' : 's'}. Este grupo es para menores de ${group.maxAge} años.`;
    }
    return null;
  }, [selectedGroupId, selectedPersonBirthDate, groups, activityStartDate]);

  const title =
    activityType === 'ANNUAL'
      ? `Semana del ${weeklyDays[0].toLocaleDateString('es-AR', {
          day: 'numeric',
          month: 'short',
        })} al ${weeklyDays[6].toLocaleDateString('es-AR', {
          day: 'numeric',
          month: 'short',
        })}`
      : currentDate.toLocaleDateString('es-AR', {
          month: 'long',
          year: 'numeric',
        });

  const movePeriod = (delta: number) => {
    const next = new Date(currentDate);
    if (activityType === 'ANNUAL') {
      next.setDate(next.getDate() + delta * 7);
    } else {
      next.setMonth(next.getMonth() + delta);
    }
    setCurrentDate(next);
  };

  const daysToRender = activityType === 'ANNUAL' ? weeklyDays : monthlyDays;

  const annualScheduleByGroup = useMemo(
    () =>
      groups.map((group) => {
        const weeklySlots = sessions
          .filter((session) => session.activityGroupId === group.id)
          .map((session) => {
            const date = new Date(session.date);
            return {
              key: `${getMondayWeekdayIndex(date)}-${session.schedule}-${session.id}`,
              weekdayIndex: getMondayWeekdayIndex(date),
              weekday: longWeekdayLabels[getMondayWeekdayIndex(date)],
              schedule: session.schedule,
            };
          })
          .sort((a, b) => {
            if (a.weekdayIndex !== b.weekdayIndex) {
              return a.weekdayIndex - b.weekdayIndex;
            }
            return a.schedule.localeCompare(b.schedule, 'es-AR');
          })
          .filter(
            (slot, index, allSlots) =>
              allSlots.findIndex(
                (candidate) =>
                  candidate.weekdayIndex === slot.weekdayIndex &&
                  candidate.schedule === slot.schedule
              ) === index
          );

        return { group, weeklySlots };
      }),
    [groups, sessions]
  );

  const monthlySessions = useMemo(
    () =>
      sessions
        .filter((session) => {
          const date = new Date(session.date);
          return (
            date.getFullYear() === currentDate.getFullYear() &&
            date.getMonth() === currentDate.getMonth()
          );
        })
        .map((session) => ({
          ...session,
          dateObject: new Date(session.date),
          group: groups.find((group) => group.id === session.activityGroupId),
        }))
        .sort((a, b) => a.dateObject.getTime() - b.dateObject.getTime()),
    [sessions, groups, currentDate]
  );

  return (
    <section className="rounded-lg border bg-card p-5 space-y-4">
      <div className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">
          Elegí grupo y horarios
        </h2>
        <p className="text-sm text-muted-foreground font-body">
          {activityType !== 'ANNUAL'
            ? 'Hacé clic en una sesión del calendario para elegir qué encuentro querés pagar. Las opciones se filtran por la edad de la persona seleccionada.'
            : 'Hacé clic en un horario del calendario para elegir el grupo al que querés inscribirte. Las opciones se filtran por la edad de la persona seleccionada.'}
        </p>

        {isPersonSelected &&
          selectedPersonAge !== null &&
          selectedPersonAge !== undefined && (
            <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground font-body">
              Mostrando grupos disponibles para {selectedPersonAge} año
              {selectedPersonAge === 1 ? '' : 's'}.
            </p>
          )}

        {groups.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground font-body">
            No hay grupos disponibles para la persona seleccionada.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => {
              const colors = groupColorMap.get(group.id)!;
              const isSelected =
                activityType === 'ANNUAL' && group.id === selectedGroupId;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    onGroupChange(group.id);
                    if (activityType !== 'ANNUAL') {
                      onSessionChange?.('');
                    }
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer text-left ${
                    isSelected ? colors.pillSelected : colors.pill
                  }`}
                >
                  <span className="block leading-tight">
                    {group.name}
                    {(group.minAge !== null || group.maxAge !== null) && (
                      <span className="ml-1 opacity-70">
                        ({group.minAge ?? '0'}-{group.maxAge ?? '∞'} años)
                      </span>
                    )}
                  </span>
                  {group.professors.length > 0 && (
                    <span className="block leading-tight opacity-75 font-normal mt-0.5">
                      {group.professors.join(', ')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {ageWarning && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 font-body">
            ⚠ {ageWarning}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          className="rounded-md border px-3 py-1 text-sm"
          onClick={() => movePeriod(-1)}
        >
          ←
        </button>
        <p className="text-sm font-medium capitalize">{title}</p>
        <button
          type="button"
          className="rounded-md border px-3 py-1 text-sm"
          onClick={() => movePeriod(1)}
        >
          →
        </button>
      </div>

      <div className="space-y-3 sm:hidden">
        {activityType === 'ANNUAL' ? (
          annualScheduleByGroup.map(({ group, weeklySlots }) => {
            const colors = groupColorMap.get(group.id)!;
            const isSelected = group.id === selectedGroupId;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => onGroupChange(group.id)}
                className={`w-full rounded-xl border p-4 text-left shadow-sm transition-colors ${
                  isSelected
                    ? `${colors.slotSelected} shadow-md`
                    : 'bg-background hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-heading text-base font-semibold leading-tight">
                      {group.name}
                    </p>
                    <p className="text-xs opacity-75">
                      Edad: {formatAgeRange(group)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${
                      isSelected ? 'border-white/60' : colors.pill
                    }`}
                  >
                    {isSelected ? 'Elegido' : 'Elegir'}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {weeklySlots.length > 0 ? (
                    weeklySlots.map((slot) => (
                      <div
                        key={slot.key}
                        className={`rounded-lg border px-3 py-2 text-sm ${
                          isSelected
                            ? 'border-white/30 bg-white/10'
                            : 'border-border bg-muted/25'
                        }`}
                      >
                        <p className="font-medium capitalize">{slot.weekday}</p>
                        <p className="text-xs opacity-80">{slot.schedule}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border border-dashed px-3 py-2 text-sm opacity-75">
                      Todavía no hay días y horarios cargados para este grupo.
                    </p>
                  )}
                </div>

                <p className="mt-3 text-xs opacity-80">
                  Profe:{' '}
                  {group.professors.length > 0
                    ? group.professors.join(', ')
                    : 'a confirmar'}
                </p>
              </button>
            );
          })
        ) : monthlySessions.length > 0 ? (
          monthlySessions.map((session) => {
            const group = session.group ?? null;
            const colors =
              group && groupColorMap.has(group.id)
                ? groupColorMap.get(group.id)!
                : GROUP_COLORS[0];
            const isSelected = session.id === selectedSessionId;
            return (
              <button
                key={session.id}
                type="button"
                onClick={() => {
                  onGroupChange(group?.id ?? '');
                  onSessionChange?.(session.id);
                }}
                className={`w-full rounded-xl border p-4 text-left shadow-sm transition-colors ${
                  isSelected
                    ? `${colors.slotSelected} shadow-md`
                    : 'bg-background hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {session.sportIcon && (
                    <Image
                      src={`/icons/${session.sportIcon}`}
                      alt=""
                      width={28}
                      height={28}
                      unoptimized
                      className="mt-0.5 opacity-80"
                    />
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-heading text-base font-semibold capitalize leading-tight">
                      {formatSessionDate(session.dateObject)}
                    </p>
                    <p className="text-sm font-medium">{session.schedule}</p>
                    <p className="text-xs opacity-80">
                      {group
                        ? `${group.name} · ${formatAgeRange(group)}`
                        : 'Sin grupo asignado'}
                    </p>
                    <p className="text-xs opacity-80">
                      Profe:{' '}
                      {group && group.professors.length > 0
                        ? group.professors.join(', ')
                        : 'a confirmar'}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground font-body">
            No hay sesiones cargadas para este mes.
          </div>
        )}
      </div>

      <div className="hidden grid-cols-7 gap-1 text-center sm:grid">
        {weekdayLabels.map((label) => (
          <p
            key={label}
            className="text-xs font-medium text-muted-foreground pb-1"
          >
            {label}
          </p>
        ))}
      </div>

      <div className="hidden gap-1 sm:grid sm:grid-cols-7">
        {daysToRender.map((day) => {
          const key = getDateKey(day);
          const daySessions = sessionsByDate.get(key) ?? [];
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          return (
            <div
              key={key}
              className={`min-h-[56px] rounded-md border p-1.5 ${
                daySessions.length === 0 ? 'hidden sm:block' : ''
              } ${
                activityType !== 'ANNUAL' && !isCurrentMonth ? 'opacity-30' : ''
              }`}
            >
              <p className="text-xs font-semibold text-muted-foreground">
                {day.getDate()}
              </p>
              <div className="mt-1 space-y-0.5">
                {daySessions.map((session) => {
                  const group =
                    groups.find((g) => g.id === session.activityGroupId) ??
                    null;
                  const colors =
                    group && groupColorMap.has(group.id)
                      ? groupColorMap.get(group.id)!
                      : GROUP_COLORS[0];
                  const isSelected =
                    activityType !== 'ANNUAL'
                      ? session.id === selectedSessionId
                      : group?.id === selectedGroupId;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => {
                        onGroupChange(group?.id ?? '');
                        if (activityType !== 'ANNUAL') {
                          onSessionChange?.(session.id);
                        }
                      }}
                      className={`w-full rounded border px-1.5 py-0.5 text-left text-xs transition-colors cursor-pointer ${
                        isSelected ? colors.slotSelected : colors.slot
                      }`}
                    >
                      {activityType !== 'ANNUAL' && session.sportIcon && (
                        <div className="mb-0.5">
                          <Image
                            src={`/icons/${session.sportIcon}`}
                            alt=""
                            width={20}
                            height={20}
                            unoptimized
                            className="opacity-80"
                          />
                        </div>
                      )}
                      <p className="font-medium truncate leading-tight">
                        {group?.name ?? 'Sesión'}
                      </p>
                      <p className="leading-tight opacity-80">
                        {session.schedule}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
