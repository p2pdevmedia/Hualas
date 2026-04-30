'use client';

import { useState, useMemo } from 'react';

export type CalendarActivityDay = {
  id: string;
  date: string; // YYYY-MM-DD
  activityId: string;
  activityName: string;
  schedule: string;
  geoLocation: string;
};

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function ActivityCalendar({ activityDays }: { activityDays: CalendarActivityDay[] }) {
  const today = new Date();
  const todayKey = toLocalDateKey(today);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const dayMap = useMemo(() => {
    const map = new Map<string, CalendarActivityDay[]>();
    for (const day of activityDays) {
      const existing = map.get(day.date) ?? [];
      map.set(day.date, [...existing, day]);
    }
    return map;
  }, [activityDays]);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Monday-first: Sunday (0) → position 6, Monday (1) → position 0
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((firstDayOfWeek + lastDay.getDate()) / 7) * 7;

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - firstDayOfWeek + 1;
    return dayNum >= 1 && dayNum <= lastDay.getDate() ? dayNum : null;
  });

  function cellKey(dayNum: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedKey(null);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedKey(null);
  }

  const selectedActivities = selectedKey ? (dayMap.get(selectedKey) ?? []) : [];

  const upcoming = useMemo(
    () => activityDays.filter(d => d.date >= todayKey).slice(0, 8),
    [activityDays, todayKey]
  );

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4 lg:sticky lg:top-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-lg leading-none"
        >
          ‹
        </button>
        <span className="text-sm font-semibold">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-lg leading-none"
        >
          ›
        </button>
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground pb-1">
            {d}
          </div>
        ))}
        {cells.map((dayNum, i) => {
          if (dayNum === null) return <div key={i} />;
          const key = cellKey(dayNum);
          const hasActivity = dayMap.has(key);
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;

          return (
            <button
              key={i}
              type="button"
              onClick={() => hasActivity && setSelectedKey(isSelected ? null : key)}
              disabled={!hasActivity}
              className={[
                'relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors',
                isSelected ? 'bg-primary text-primary-foreground font-semibold' : '',
                isToday && !isSelected ? 'ring-1 ring-primary text-primary font-semibold' : '',
                hasActivity && !isSelected ? 'font-medium hover:bg-muted cursor-pointer' : '',
                !hasActivity ? 'text-muted-foreground cursor-default' : '',
              ].join(' ')}
            >
              {dayNum}
              {hasActivity && (
                <span
                  className={[
                    'absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full',
                    isSelected ? 'bg-primary-foreground' : 'bg-primary',
                  ].join(' ')}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedKey && selectedActivities.length > 0 && (
        <div className="border-t pt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {new Date(selectedKey + 'T12:00:00').toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
          {selectedActivities.map(d => (
            <div key={d.id}>
              <p className="text-sm font-medium">{d.activityName}</p>
              <p className="text-xs text-muted-foreground">
                {d.schedule} · {d.geoLocation}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming sessions */}
      {!selectedKey && upcoming.length > 0 && (
        <div className="border-t pt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Próximas sesiones
          </p>
          {upcoming.map(d => (
            <div key={d.id}>
              <p className="text-sm font-medium">{d.activityName}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(d.date + 'T12:00:00').toLocaleDateString('es-AR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}{' '}
                · {d.schedule}
              </p>
            </div>
          ))}
        </div>
      )}

      {!selectedKey && upcoming.length === 0 && (
        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground">No hay sesiones próximas.</p>
        </div>
      )}
    </div>
  );
}
