'use client';

import { useMemo, useState } from 'react';

type Group = { id: string; name: string };
type Session = { id: string; date: string; schedule: string; activityGroupId: string | null };

type Props = {
  activityType: 'ANNUAL' | 'TEMPORARY';
  groups: Group[];
  sessions: Session[];
  selectedGroupId: string;
  onGroupChange: (value: string) => void;
};

const weekdayLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function getWeekStartMonday(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default function GroupScheduleCalendar({ activityType, groups, sessions, selectedGroupId, onGroupChange }: Props) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null;

  const groupSessions = useMemo(() => {
    if (!selectedGroupId) return [];
    return sessions.filter((session) => session.activityGroupId === selectedGroupId);
  }, [selectedGroupId, sessions]);

  const weeklyDays = useMemo(() => {
    const start = getWeekStartMonday(currentDate);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [currentDate]);

  const monthlyDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const start = getWeekStartMonday(firstDay);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [currentDate]);

  const title = currentDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const session of groupSessions) {
      const key = new Date(session.date).toISOString().slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(session);
      map.set(key, list);
    }
    return map;
  }, [groupSessions]);

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
    <section className="w-full rounded-lg border bg-card p-5 space-y-4">
      <div className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Elegí grupo y horarios</h2>
        <p className="text-sm text-muted-foreground font-body">Para inscribirte en esta actividad tenés que elegir un grupo.</p>
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={selectedGroupId}
          onChange={(e) => onGroupChange(e.target.value)}
        >
          <option value="" disabled>Seleccioná un grupo</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>{group.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between">
        <button type="button" className="rounded-md border px-3 py-1 text-sm" onClick={() => movePeriod(-1)}>←</button>
        <p className="text-sm font-medium capitalize">{title}</p>
        <button type="button" className="rounded-md border px-3 py-1 text-sm" onClick={() => movePeriod(1)}>→</button>
      </div>

      <div className={`grid gap-2 ${activityType === 'ANNUAL' ? 'grid-cols-1 sm:grid-cols-7' : 'grid-cols-7'}`}>
        {daysToRender.map((day, index) => {
          const key = day.toISOString().slice(0, 10);
          const daySessions = sessionsByDate.get(key) ?? [];
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          return (
            <div key={key} className={`rounded-md border p-2 ${activityType === 'TEMPORARY' && !isCurrentMonth ? 'opacity-40' : ''}`}>
              <p className="text-xs text-muted-foreground">{weekdayLabels[day.getDay() === 0 ? 6 : day.getDay() - 1]}</p>
              <p className="text-sm font-semibold">{day.getDate()}</p>
              <div className="mt-1 space-y-1">
                {daySessions.map((session) => (
                  <div key={session.id} className="rounded bg-muted px-2 py-1 text-xs">
                    <p className="font-medium">{selectedGroup?.name ?? 'Grupo'}</p>
                    <p>{session.schedule}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
