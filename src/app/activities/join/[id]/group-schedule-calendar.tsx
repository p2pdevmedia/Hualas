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
  activityType: 'ANNUAL' | 'TEMPORARY';
  groups: Group[];
  sessions: Session[];
  selectedGroupId: string;
  onGroupChange: (value: string) => void;
  selectedPersonBirthDate?: string | null;
  activityStartDate?: string | null;
};

const weekdayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

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

export default function GroupScheduleCalendar({
  activityType,
  groups,
  sessions,
  selectedGroupId,
  onGroupChange,
  selectedPersonBirthDate,
  activityStartDate,
}: Props) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

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
      if (!session.activityGroupId) continue;
      const key = new Date(session.date).toISOString().slice(0, 10);
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

  const title = currentDate.toLocaleDateString('es-AR', {
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

  return (
    <section className="rounded-lg border bg-card p-5 space-y-4">
      <div className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">
          Elegí grupo y horarios
        </h2>
        <p className="text-sm text-muted-foreground font-body">
          Hacé clic en un horario del calendario para elegir el grupo al que
          querés inscribirte.
        </p>

        <div className="flex flex-wrap gap-2">
          {groups.map((group) => {
            const colors = groupColorMap.get(group.id)!;
            const isSelected = group.id === selectedGroupId;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => onGroupChange(group.id)}
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

      <div className="grid grid-cols-1 gap-1 sm:grid-cols-7">
        {daysToRender.map((day) => {
          const key = day.toISOString().slice(0, 10);
          const daySessions = sessionsByDate.get(key) ?? [];
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          return (
            <div
              key={key}
              className={`min-h-[56px] rounded-md border p-1.5 ${
                daySessions.length === 0 ? 'hidden sm:block' : ''
              } ${
                activityType === 'TEMPORARY' && !isCurrentMonth
                  ? 'opacity-30'
                  : ''
              }`}
            >
              <p className="text-xs font-semibold text-muted-foreground">
                {day.getDate()}
              </p>
              <div className="mt-1 space-y-0.5">
                {daySessions.map((session) => {
                  const group = groups.find(
                    (g) => g.id === session.activityGroupId
                  );
                  if (!group) return null;
                  const colors = groupColorMap.get(group.id)!;
                  const isSelected = group.id === selectedGroupId;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => onGroupChange(group.id)}
                      className={`w-full rounded border px-1.5 py-0.5 text-left text-xs transition-colors cursor-pointer ${
                        isSelected ? colors.slotSelected : colors.slot
                      }`}
                    >
                      {activityType === 'TEMPORARY' && session.sportIcon && (
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
                        {group.name}
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
