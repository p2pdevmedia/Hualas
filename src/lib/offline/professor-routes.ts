type ProfessorOfflineDay = {
  id: string;
  activityId: string;
};

const PROFESSOR_SESSION_SUBROUTES = [
  'attendance',
  'observaciones',
  'descripcion',
  'informacion',
];

export function buildProfessorSessionOfflineHrefs(
  days: ProfessorOfflineDay[]
): string[] {
  const hrefs = new Set<string>();

  for (const day of days) {
    const baseHref = `/activities/${day.activityId}/days/${day.id}`;
    hrefs.add(baseHref);

    for (const subroute of PROFESSOR_SESSION_SUBROUTES) {
      hrefs.add(`${baseHref}/${subroute}`);
    }
  }

  return Array.from(hrefs);
}

export async function warmOfflineRoutes(hrefs: string[]): Promise<void> {
  if (!navigator.onLine || hrefs.length === 0) return;

  for (const href of hrefs) {
    try {
      await fetch(href, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'text/html' },
      });
    } catch {
      // Best effort only. The normal offline page still handles cache misses.
    }
  }
}
