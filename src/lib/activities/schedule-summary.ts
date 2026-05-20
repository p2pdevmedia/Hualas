export type ActivityScheduleSummaryType = 'TEMPORARY' | 'EVENTUAL' | 'ANNUAL';

export type ActivityScheduleDay = {
  id: string;
  date: Date;
  schedule: string;
  cancelled: boolean;
};

export type ActivityScheduleSummary = ActivityScheduleDay & {
  weekday?: number;
  repeatsWeekly: boolean;
};

function getUtcWeekday(date: Date) {
  return date.getUTCDay();
}

function getWeekdaySortValue(weekday: number) {
  return weekday === 0 ? 7 : weekday;
}

export function summarizeActivitySchedules(
  activityType: ActivityScheduleSummaryType,
  days: ActivityScheduleDay[]
): ActivityScheduleSummary[] {
  if (activityType !== 'ANNUAL') {
    return days.map((day) => ({ ...day, repeatsWeekly: false }));
  }

  const summaries = new Map<
    string,
    ActivityScheduleSummary & {
      totalSessions: number;
      cancelledSessions: number;
    }
  >();

  for (const day of days) {
    const weekday = getUtcWeekday(day.date);
    const key = `${weekday}:${day.schedule.trim().toLowerCase()}`;
    const existing = summaries.get(key);

    if (existing) {
      existing.totalSessions += 1;
      if (day.cancelled) existing.cancelledSessions += 1;
      if (day.date < existing.date) {
        existing.date = day.date;
        existing.id = day.id;
      }
      continue;
    }

    summaries.set(key, {
      ...day,
      weekday,
      repeatsWeekly: true,
      totalSessions: 1,
      cancelledSessions: day.cancelled ? 1 : 0,
    });
  }

  return Array.from(summaries.values())
    .map(({ totalSessions, cancelledSessions, ...summary }) => ({
      ...summary,
      cancelled: totalSessions > 0 && cancelledSessions === totalSessions,
    }))
    .sort((a, b) => {
      const weekdayA = getWeekdaySortValue(a.weekday ?? getUtcWeekday(a.date));
      const weekdayB = getWeekdaySortValue(b.weekday ?? getUtcWeekday(b.date));
      if (weekdayA !== weekdayB) return weekdayA - weekdayB;
      return a.schedule.localeCompare(b.schedule, 'es');
    });
}
