'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useMemo } from 'react';

export type CalendarActivityDay = {
  id: string;
  date: string; // YYYY-MM-DD
  activityId: string;
  activityName: string;
  schedule: string;
  geoLocation: string;
  sportIcon: string | null;
  cancelled: boolean;
};

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = [
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

function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function ActivityCalendar({
  activityDays,
  onDaySelect,
  onEdit,
}: {
  activityDays: CalendarActivityDay[];
  onDaySelect?: (dayId: string | null) => void;
  onEdit?: (dayId: string) => void;
}) {
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
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday-first
  const totalCells = Math.ceil((firstDayOfWeek + lastDay.getDate()) / 7) * 7;

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - firstDayOfWeek + 1;
    return dayNum >= 1 && dayNum <= lastDay.getDate() ? dayNum : null;
  });

  function cellKey(dayNum: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
  }

  function prevMonth() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
    setSelectedKey(null);
  }

  function nextMonth() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
    setSelectedKey(null);
  }

  const selectedActivities = selectedKey ? (dayMap.get(selectedKey) ?? []) : [];

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xl leading-none"
        >
          ‹
        </button>
        <span className="text-base font-semibold">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xl leading-none"
        >
          ›
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-border">
        {cells.map((dayNum, i) => {
          if (dayNum === null) {
            return <div key={i} className="h-28 bg-muted/20" />;
          }

          const key = cellKey(dayNum);
          const activities = dayMap.get(key) ?? [];
          const hasActivity = activities.length > 0;
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const isPast = key < todayKey;

          const displayActivities = activities.slice(0, 2);
          const allCancelled = activities.length > 0 && activities.every((a) => a.cancelled);

          return (
            <button
              key={i}
              type="button"
              onClick={() =>
                hasActivity && setSelectedKey(isSelected ? null : key)
              }
              disabled={!hasActivity}
              className={[
                'relative h-28 flex flex-col items-center pt-1.5 gap-1 transition-colors text-left',
                isSelected ? 'bg-primary/10' : '',
                hasActivity && !isSelected
                  ? 'hover:bg-muted/60 cursor-pointer'
                  : '',
                !hasActivity ? 'cursor-default' : '',
                isPast && !isToday ? 'opacity-50' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {/* Day number */}
              <span
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium leading-none',
                  isToday ? 'bg-primary text-primary-foreground' : '',
                  isSelected && !isToday ? 'text-primary font-semibold' : '',
                  !isToday && !isSelected ? 'text-foreground' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {dayNum}
              </span>

              {/* Activity icons */}
              {displayActivities.some((a) => a.sportIcon) ? (
                <div className="flex gap-0.5 w-full flex-1 min-h-0 items-center">
                  {displayActivities.map((a, idx) =>
                    a.sportIcon ? (
                      <div key={idx} className="relative flex-1 min-w-0 h-full flex items-center justify-center">
                        <Image
                          src={`/icons/${a.sportIcon}`}
                          alt=""
                          width={56}
                          height={56}
                          className={`h-full w-full object-contain ${a.cancelled ? 'opacity-30' : ''}`}
                        />
                        {a.cancelled && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                              ✕
                            </span>
                          </span>
                        )}
                      </div>
                    ) : null
                  )}
                </div>
              ) : hasActivity ? (
                <span className={`h-1.5 w-1.5 rounded-full mt-1 ${allCancelled ? 'bg-red-400' : 'bg-primary'}`} />
              ) : null}

              {/* More indicator */}
              {activities.length > 2 && (
                <span className="text-[10px] text-muted-foreground leading-none">
                  +{activities.length - 2}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedKey && selectedActivities.length > 0 && (
        <div className="border-t px-5 py-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {new Date(selectedKey + 'T12:00:00').toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
          {selectedActivities.map((d) => (
            <div key={d.id}>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  {d.sportIcon ? (
                    <Image
                      src={`/icons/${d.sportIcon}`}
                      alt=""
                      width={64}
                      height={64}
                      className={`h-16 w-16 object-contain ${d.cancelled ? 'opacity-30' : ''}`}
                    />
                  ) : (
                    <span className={`h-2 w-2 rounded-full ${d.cancelled ? 'bg-red-400' : 'bg-primary'}`} />
                  )}
                  {d.cancelled && d.sportIcon && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white leading-none">
                        ✕
                      </span>
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${d.cancelled ? 'line-through text-muted-foreground' : ''}`}>
                      {d.activityName}
                    </p>
                    {d.cancelled && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                        Cancelado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {d.schedule} · {d.geoLocation}
                  </p>
                </div>
              </div>
              {onEdit && (
                <div className="mt-2 flex gap-2">
                  <Link
                    href={`/activities/${d.activityId}/days/${d.id}`}
                    className="shrink-0 rounded-full border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    Ver sesión
                  </Link>
                  <button
                    type="button"
                    onClick={() => onEdit(d.id)}
                    className="shrink-0 rounded-full border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    Editar sesión
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
