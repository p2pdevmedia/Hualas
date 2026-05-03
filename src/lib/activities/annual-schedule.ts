type AnnualScheduleTemplate = {
  tempId?: string;
  weekday: number;
  schedule: string;
  groupTempId?: string;
  groupId?: string;
  professorIds?: string[];
};

type AnnualSharedFields = {
  description?: string;
  geoLocation: string;
  latitude: number;
  longitude: number;
  sportIcon?: string;
};

type AnnualScheduledDay = AnnualScheduleTemplate &
  AnnualSharedFields & {
    date: Date;
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
  templates: AnnualScheduleTemplate[],
  sharedFields: AnnualSharedFields
) {
  const start = startOfUtcDay(startDate);
  const end = startOfUtcDay(endDate);
  const days: AnnualScheduledDay[] = [];

  for (let cursor = start; cursor <= end; cursor = addUtcDays(cursor, 1)) {
    const weekday = cursor.getUTCDay();
    for (const template of templates) {
      if (template.weekday !== weekday) continue;
      days.push({
        ...template,
        date: new Date(cursor),
        description: sharedFields.description,
        geoLocation: sharedFields.geoLocation,
        latitude: sharedFields.latitude,
        longitude: sharedFields.longitude,
        sportIcon: sharedFields.sportIcon,
      });
    }
  }

  return days;
}
