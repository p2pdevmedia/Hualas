import Link from 'next/link';
import Image from 'next/image';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isCounterRole } from '@/lib/accounting';
import { prisma } from '@/lib/prisma';
import ActivityCalendar, { type CalendarActivityDay } from './activity-calendar';

type UpcomingSession = {
  id: string;
  date: string;
  schedule: string;
  geoLocation: string;
  sportIcon: string | null;
  latitude: number | null;
  longitude: number | null;
};

export default async function MyActivitiesPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }
  if (isCounterRole(session.user.role)) {
    redirect('/accounting');
  }

  const userId = session.user.id;

  let participations: Array<{
    id: string;
    childId: string | null;
    child: { id: string; name: string; lastName: string | null } | null;
    activity: {
      id: string;
      name: string;
      date: Date;
      frequency: string;
    };
  }> = [];
  let professorAssignments: Array<{
    id: string;
    activity: {
      id: string;
      name: string;
      date: Date;
      frequency: string;
    };
  }> = [];

  try {
    [participations, professorAssignments] = await Promise.all([
      prisma.activityParticipant.findMany({
        where: {
          OR: [{ userId }, { child: { userId } }],
        },
        include: {
          activity: {
            select: { id: true, name: true, date: true, frequency: true },
          },
          child: { select: { id: true, name: true, lastName: true } },
        },
        orderBy: { activity: { date: 'asc' } },
      }),
      prisma.activityProfessor.findMany({
        where: { userId },
        include: {
          activity: {
            select: { id: true, name: true, date: true, frequency: true },
          },
        },
        orderBy: { activity: { date: 'asc' } },
      }),
    ]);
  } catch {
    participations = [];
    professorAssignments = [];
  }

  const activityIds = [
    ...new Set([
      ...participations.map(p => p.activity.id),
      ...professorAssignments.map(a => a.activity.id),
    ]),
  ];

  let calendarDays: CalendarActivityDay[] = [];
  if (activityIds.length > 0) {
    try {
      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      const raw = await prisma.activityDay.findMany({
        where: {
          activityId: { in: activityIds },
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: sixMonthsLater,
          },
        },
        select: {
          id: true,
          date: true,
          schedule: true,
          geoLocation: true,
          sportIcon: true,
          latitude: true,
          longitude: true,
          activity: { select: { id: true, name: true } },
        },
        orderBy: { date: 'asc' },
      });
      calendarDays = raw.map(d => ({
        id: d.id,
        date: d.date.toISOString().slice(0, 10),
        activityId: d.activity.id,
        activityName: d.activity.name,
        schedule: d.schedule,
        geoLocation: d.geoLocation,
        sportIcon: d.sportIcon,
      }));
    } catch {
      calendarDays = [];
    }
  }

  // Group upcoming sessions per activity (max 3)
  const sessionsByActivity = new Map<string, UpcomingSession[]>();
  if (activityIds.length > 0) {
    try {
      const rawSessions = await prisma.activityDay.findMany({
        where: {
          activityId: { in: activityIds },
          date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        select: {
          id: true,
          date: true,
          schedule: true,
          geoLocation: true,
          sportIcon: true,
          latitude: true,
          longitude: true,
          activityId: true,
        },
        orderBy: { date: 'asc' },
      });
      for (const s of rawSessions) {
        const list = sessionsByActivity.get(s.activityId) ?? [];
        if (list.length < 3) {
          list.push({
            id: s.id,
            date: s.date.toISOString().slice(0, 10),
            schedule: s.schedule,
            geoLocation: s.geoLocation,
            sportIcon: s.sportIcon,
            latitude: s.latitude,
            longitude: s.longitude,
          });
          sessionsByActivity.set(s.activityId, list);
        }
      }
    } catch { /* ignore */ }
  }

  const grouped = new Map<
    string,
    {
      activity: (typeof participations)[number]['activity'];
      labels: Set<string>;
      participantNames: Set<string>;
    }
  >();

  for (const p of participations) {
    const key = p.activity.id;
    const label = p.child
      ? `${p.child.name}${p.child.lastName ? ` ${p.child.lastName}` : ''}`
      : (session.user.name ?? 'Yo');
    const entry = grouped.get(key);
    if (entry) {
      entry.labels.add(label);
      entry.participantNames.add(label);
    } else {
      grouped.set(key, {
        activity: p.activity,
        labels: new Set([label]),
        participantNames: new Set([label]),
      });
    }
  }

  for (const assignment of professorAssignments) {
    const key = assignment.activity.id;
    const entry = grouped.get(key);
    if (entry) {
      entry.labels.add('Profesor');
    } else {
      grouped.set(key, {
        activity: assignment.activity,
        labels: new Set(['Profesor']),
        participantNames: new Set(),
      });
    }
  }

  const items = Array.from(grouped.values()).map((entry) => ({
    activity: entry.activity,
    labels: Array.from(entry.labels),
    participantNames: Array.from(entry.participantNames),
    sessions: sessionsByActivity.get(entry.activity.id) ?? [],
  }));

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Mis actividades
        </h1>
        <p className="text-sm text-muted-foreground">
          Actividades en las que estás inscripto vos, alguno de tus hijos o en
          las que sos profesor.
        </p>
      </div>

      <ActivityCalendar activityDays={calendarDays} />

      <div className="mt-6">
        {items.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <p>Todavía no tenés actividades asociadas.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map(({ activity, labels, participantNames, sessions }) => (
                <li
                  key={activity.id}
                  className="rounded-xl border bg-card p-5 shadow-sm space-y-4"
                >
                  {/* Header: nombre + participantes */}
                  <div>
                    <Link
                      href={`/activities/${activity.id}`}
                      className="text-lg font-semibold transition-colors hover:text-primary leading-snug"
                    >
                      {activity.name}
                    </Link>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {labels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-primary/10 px-3 py-0.5 text-sm font-medium text-primary"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Próximas sesiones */}
                  {sessions.length > 0 && (
                    <div className="space-y-2 border-t pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Próximas sesiones
                      </p>
                      <ul className="space-y-2">
                        {sessions.map((s) => {
                          const mapHref =
                            s.latitude != null && s.longitude != null
                              ? `https://www.openstreetmap.org/?mlat=${s.latitude}&mlon=${s.longitude}#map=17/${s.latitude}/${s.longitude}`
                              : null;
                          const dateLabel = new Date(
                            s.date + 'T12:00:00'
                          ).toLocaleDateString('es-AR', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          });
                          return (
                            <li
                              key={s.id}
                              className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2"
                            >
                              {s.sportIcon ? (
                                <Image
                                  src={`/icons/${s.sportIcon}`}
                                  alt=""
                                  width={56}
                                  height={56}
                                  className="h-14 w-14 shrink-0 object-contain"
                                />
                              ) : (
                                <span className="h-14 w-14 shrink-0" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <p className="text-sm font-medium leading-tight">
                                    {dateLabel} · {s.schedule}
                                  </p>
                                  {participantNames.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {participantNames.map((name) => (
                                        <span
                                          key={name}
                                          className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                                        >
                                          {name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <p className="truncate text-xs text-muted-foreground">
                                  {s.geoLocation}
                                </p>
                              </div>
                              {mapHref && (
                                <a
                                  href={mapHref}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="shrink-0 text-xs text-link hover:underline underline-offset-4"
                                >
                                  Mapa
                                </a>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
      </div>
    </main>
  );
}
