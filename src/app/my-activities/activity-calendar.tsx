'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

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
const COMPACT_DAY_OFFSETS = Array.from(
  { length: 61 },
  (_, index) => index - 14
);

type CalendarVariant = 'month' | 'professor-agenda';

function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date: Date, amount: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function formatDayTitle(date: Date, todayKey: string): string {
  const key = toLocalDateKey(date);
  if (key === todayKey) return 'hoy';
  if (key === toLocalDateKey(addDays(new Date(todayKey + 'T12:00:00'), -1))) {
    return 'ayer';
  }

  return date.toLocaleDateString('es-AR', { weekday: 'long' });
}

function ActivityIcon({
  day,
  size = 'small',
}: {
  day: CalendarActivityDay;
  size?: 'small' | 'large';
}) {
  const imageClassName = size === 'large' ? 'h-16 w-16' : 'h-10 w-10';
  const fallbackClassName = size === 'large' ? 'h-3 w-3' : 'h-2 w-2';

  return (
    <div className="relative shrink-0">
      {day.sportIcon ? (
        <Image
          src={`/icons/${day.sportIcon}`}
          alt=""
          width={size === 'large' ? 64 : 40}
          height={size === 'large' ? 64 : 40}
          className={`${imageClassName} object-contain ${day.cancelled ? 'opacity-30' : ''}`}
        />
      ) : (
        <span
          className={`block rounded-full ${fallbackClassName} ${day.cancelled ? 'bg-red-400' : 'bg-primary'}`}
        />
      )}
      {day.cancelled && day.sportIcon && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold leading-none text-white">
            ✕
          </span>
        </span>
      )}
    </div>
  );
}

function ActivitySummary({
  day,
  featured = false,
}: {
  day: CalendarActivityDay;
  featured?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ActivityIcon day={day} size={featured ? 'large' : 'small'} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`${featured ? 'text-base' : 'text-sm'} font-semibold leading-snug ${day.cancelled ? 'line-through text-muted-foreground' : ''}`}
          >
            {day.activityName}
          </p>
          {day.cancelled && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-600">
              Cancelado
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{day.schedule}</p>
        {featured && day.geoLocation && (
          <p className="text-xs text-muted-foreground">{day.geoLocation}</p>
        )}
      </div>
    </div>
  );
}

export default function ActivityCalendar({
  activityDays,
  onDaySelect,
  onEdit,
  variant = 'month',
}: {
  activityDays: CalendarActivityDay[];
  onDaySelect?: (dayId: string | null) => void;
  onEdit?: (dayId: string) => void;
  variant?: CalendarVariant;
}) {
  const today = useMemo(() => new Date(), []);
  const todayKey = toLocalDateKey(today);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showMonthCalendar, setShowMonthCalendar] = useState(
    variant === 'month'
  );
  const todayCardRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (variant !== 'professor-agenda') return;

    todayCardRef.current?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
    });
  }, [variant]);

  const dayMap = useMemo(() => {
    const map = new Map<string, CalendarActivityDay[]>();
    for (const day of activityDays) {
      const existing = map.get(day.date) ?? [];
      map.set(day.date, [...existing, day]);
    }
    return map;
  }, [activityDays]);

  const compactDays = useMemo(
    () =>
      COMPACT_DAY_OFFSETS.map((offset) => {
        const date = addDays(today, offset);
        const key = toLocalDateKey(date);
        return { date, key, offset, activities: dayMap.get(key) ?? [] };
      }),
    [dayMap, today]
  );

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
    onDaySelect?.(null);
  }

  function nextMonth() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
    setSelectedKey(null);
    onDaySelect?.(null);
  }

  function toggleSelectedDay(key: string, hasActivity: boolean) {
    if (!hasActivity) return;

    const nextKey = selectedKey === key ? null : key;
    setSelectedKey(nextKey);
    onDaySelect?.(nextKey ? (dayMap.get(nextKey)?.[0]?.id ?? null) : null);
  }

  const selectedActivities = selectedKey ? (dayMap.get(selectedKey) ?? []) : [];

  return (
    <div className="space-y-3">
      {variant === 'professor-agenda' && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Agenda de profesor</p>
              <p className="text-xs text-muted-foreground">
                Deslizá para ver días anteriores o próximos.
              </p>
            </div>
          </div>
          <div className="-mx-4 overflow-x-auto px-4 pb-2">
            <div className="flex w-max gap-3">
              {compactDays.map(({ date, key, offset, activities }) => {
                const isMainDay = offset === 0;
                const title = formatDayTitle(date, todayKey);
                const visibleActivities = activities.slice(
                  0,
                  isMainDay ? 3 : 2
                );
                return (
                  <article
                    key={key}
                    ref={isMainDay ? todayCardRef : undefined}
                    className={[
                      'rounded-2xl border bg-background p-4 shadow-sm transition-opacity',
                      isMainDay
                        ? 'w-64 scale-[1.02] border-primary/50 shadow-md'
                        : 'w-52 opacity-60',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={`${isMainDay ? 'text-base' : 'text-sm'} font-bold text-foreground`}
                        >
                          {title}
                        </p>
                        <p className="text-xs font-medium text-muted-foreground">
                          {date.toLocaleDateString('es-AR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      </div>
                    </div>

                    {visibleActivities.length === 0 ? (
                      <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                        Sin actividades programadas.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {visibleActivities.map((day) => {
                          const detailHref = `/activities/${day.activityId}/days/${day.id}`;
                          const content = (
                            <div className="space-y-3">
                              <ActivitySummary day={day} featured={isMainDay} />
                              {isMainDay && (
                                <span className="inline-flex text-xs font-semibold text-primary underline-offset-4 hover:underline">
                                  Ver detalle
                                </span>
                              )}
                            </div>
                          );

                          return isMainDay ? (
                            <Link
                              key={day.id}
                              href={detailHref}
                              prefetch={true}
                              className="block rounded-xl p-2 transition-colors hover:bg-muted/50"
                            >
                              {content}
                            </Link>
                          ) : (
                            <div key={day.id} className="rounded-xl p-2">
                              {content}
                            </div>
                          );
                        })}
                        {activities.length > visibleActivities.length && (
                          <p className="text-xs text-muted-foreground">
                            +{activities.length - visibleActivities.length}{' '}
                            actividad(es) más
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {variant === 'professor-agenda' && (
        <button
          type="button"
          onClick={() => setShowMonthCalendar((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
          aria-expanded={showMonthCalendar}
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          Calendario
        </button>
      )}

      {showMonthCalendar && (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          {/* Month navigation */}
          <div className="flex items-center justify-between border-b px-5 py-4">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-md text-xl leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              ‹
            </button>
            <span className="text-base font-semibold">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-md text-xl leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
              const allCancelled =
                activities.length > 0 && activities.every((a) => a.cancelled);

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleSelectedDay(key, hasActivity)}
                  disabled={!hasActivity}
                  className={[
                    'relative flex h-28 flex-col items-center gap-1 pt-1.5 text-left transition-colors',
                    isSelected ? 'bg-primary/10' : '',
                    hasActivity && !isSelected
                      ? 'cursor-pointer hover:bg-muted/60'
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
                      isSelected && !isToday
                        ? 'font-semibold text-primary'
                        : '',
                      !isToday && !isSelected ? 'text-foreground' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {dayNum}
                  </span>

                  {/* Activity icons */}
                  {displayActivities.some((a) => a.sportIcon) ? (
                    <div className="flex min-h-0 w-full flex-1 items-center gap-0.5">
                      {displayActivities.map((a, idx) =>
                        a.sportIcon ? (
                          <div
                            key={idx}
                            className="relative flex h-full min-w-0 flex-1 items-center justify-center"
                          >
                            <Image
                              src={`/icons/${a.sportIcon}`}
                              alt=""
                              width={56}
                              height={56}
                              className={`h-full w-full object-contain ${a.cancelled ? 'opacity-30' : ''}`}
                            />
                            {a.cancelled && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold leading-none text-white">
                                  ✕
                                </span>
                              </span>
                            )}
                          </div>
                        ) : null
                      )}
                    </div>
                  ) : hasActivity ? (
                    <span
                      className={`mt-1 h-1.5 w-1.5 rounded-full ${allCancelled ? 'bg-red-400' : 'bg-primary'}`}
                    />
                  ) : null}

                  {/* More indicator */}
                  {activities.length > 2 && (
                    <span className="text-[10px] leading-none text-muted-foreground">
                      +{activities.length - 2}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected day detail */}
          {selectedKey && selectedActivities.length > 0 && (
            <div className="space-y-3 border-t px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {new Date(selectedKey + 'T12:00:00').toLocaleDateString(
                  'es-AR',
                  {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  }
                )}
              </p>
              {selectedActivities.map((d) => (
                <div key={d.id}>
                  <div className="flex items-center gap-3">
                    <ActivityIcon day={d} size="large" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm font-medium ${d.cancelled ? 'line-through text-muted-foreground' : ''}`}
                        >
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
                        prefetch={true}
                        className="shrink-0 rounded-full border border-primary px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                      >
                        Ver sesión
                      </Link>
                      <button
                        type="button"
                        onClick={() => onEdit(d.id)}
                        className="shrink-0 rounded-full border border-primary px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
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
      )}
    </div>
  );
}
