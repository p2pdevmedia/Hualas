type AnnualScheduleTemplate = {
  weekday: number;
  schedule: string;
  description?: string;
  geoLocation: string;
  latitude: number;
  longitude: number;
};

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12)
  );
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function buildAnnualActivityDays(
  startDate: Date,
  endDate: Date,
  templates: AnnualScheduleTemplate[]
) {
  const start = startOfUtcDay(startDate);
  const end = startOfUtcDay(endDate);
  const days: Array<AnnualScheduleTemplate & { date: Date }> = [];

  for (let cursor = start; cursor <= end; cursor = addUtcDays(cursor, 1)) {
    const weekday = cursor.getUTCDay();
    for (const template of templates) {
      if (template.weekday !== weekday) continue;
      days.push({
        ...template,
        date: new Date(cursor),
      });
    }
  }

  return days;
}
