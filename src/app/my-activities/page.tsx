import Link from 'next/link';
import Image from 'next/image';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import RoleSwitchPrompt from '@/components/role-switch-prompt';
import { hasProfessorCapability } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import ActivityCalendar, {
  type CalendarActivityDay,
} from './activity-calendar';

type UpcomingSession = {
  id: string;
  date: string;
  schedule: string;
  geoLocation: string;
  sportIcon: string | null;
  latitude: number | null;
  longitude: number | null;
  activityGroupId: string | null;
  groupName: string | null;
  cancelled: boolean;
};

type ActivityParticipantSummary = {
  label: string;
  isChild: boolean;
  groupId: string | null;
};

export default async function MyActivitiesPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }
  const activeRole = session.user.activeRole ?? session.user.role;
  if (activeRole !== 'MEMBER' && activeRole !== 'PROFESSOR') {
    return hasProfessorCapability(session) ? (
      <RoleSwitchPrompt requiredRole="PROFESSOR" />
    ) : (
      <RoleSwitchPrompt requiredRole="MEMBER" />
    );
  }

  const userId = session.user.id;
  const isProfessorView = activeRole === 'PROFESSOR';

  let participations: Array<{
    id: string;
    childId: string | null;
    child: { id: string; name: string; lastName: string | null } | null;
    groupMembership: { activityGroupId: string | null } | null;
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
    if (isProfessorView) {
      professorAssignments = await prisma.activityProfessor.findMany({
        where: { userId },
        include: {
          activity: {
            select: { id: true, name: true, date: true, frequency: true },
          },
        },
        orderBy: { activity: { date: 'asc' } },
      });
    } else {
      const accessibleChildOwnerIds = await getAccessibleChildOwnerIds(userId);
      participations = await prisma.activityParticipant.findMany({
        where: {
          OR: [
            { userId },
            { child: { userId: { in: accessibleChildOwnerIds } } },
          ],
        },
        include: {
          activity: {
            select: { id: true, name: true, date: true, frequency: true },
          },
          child: { select: { id: true, name: true, lastName: true } },
          groupMembership: {
            select: {
              activityGroupId: true,
            },
          },
        },
        orderBy: { activity: { date: 'asc' } },
      });
    }
  } catch {
    participations = [];
    professorAssignments = [];
  }

  const activityIds = [
    ...new Set([
      ...participations.map((p) => p.activity.id),
      ...professorAssignments.map((a) => a.activity.id),
    ]),
  ];

  const participantScopeByActivity = new Map<
    string,
    { groupIds: Set<string>; hasUngroupedParticipant: boolean }
  >();
  for (const participation of participations) {
    const current = participantScopeByActivity.get(
      participation.activity.id
    ) ?? {
      groupIds: new Set<string>(),
      hasUngroupedParticipant: false,
    };
    const groupId = participation.groupMembership?.activityGroupId ?? null;
    if (groupId) {
      current.groupIds.add(groupId);
    } else {
      current.hasUngroupedParticipant = true;
    }
    participantScopeByActivity.set(participation.activity.id, current);
  }

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
          ...(isProfessorView ? { professors: { some: { userId } } } : {}),
        },
        select: {
          id: true,
          date: true,
          schedule: true,
          geoLocation: true,
          sportIcon: true,
          latitude: true,
          longitude: true,
          activityGroupId: true,
          cancelled: true,
          activity: { select: { id: true, name: true } },
        },
        orderBy: { date: 'asc' },
      });
      calendarDays = raw
        .filter((d) => {
          if (isProfessorView) return true;
          const scope = participantScopeByActivity.get(d.activity.id);
          if (!scope) return false;
          if (d.activityGroupId === null) return scope.hasUngroupedParticipant;
          return scope.groupIds.has(d.activityGroupId);
        })
        .map((d) => ({
          id: d.id,
          date: d.date.toISOString().slice(0, 10),
          activityId: d.activity.id,
          activityName: d.activity.name,
          schedule: d.schedule,
          geoLocation: d.geoLocation,
          sportIcon: d.sportIcon,
          cancelled: d.cancelled,
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
          ...(isProfessorView ? { professors: { some: { userId } } } : {}),
        },
        select: {
          id: true,
          date: true,
          schedule: true,
          geoLocation: true,
          sportIcon: true,
          latitude: true,
          longitude: true,
          activityGroupId: true,
          activityId: true,
          cancelled: true,
          activityGroup: { select: { name: true } },
        },
        orderBy: { date: 'asc' },
      });
      for (const s of rawSessions) {
        if (!isProfessorView) {
          const scope = participantScopeByActivity.get(s.activityId);
          if (!scope) continue;
          if (s.activityGroupId === null) {
            if (!scope.hasUngroupedParticipant) continue;
          } else if (!scope.groupIds.has(s.activityGroupId)) {
            continue;
          }
        }
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
            activityGroupId: s.activityGroupId,
            groupName: s.activityGroup?.name ?? null,
            cancelled: s.cancelled,
          });
          sessionsByActivity.set(s.activityId, list);
        }
      }
    } catch {
      /* ignore */
    }
  }

  const grouped = new Map<
    string,
    {
      activity: (typeof participations)[number]['activity'];
      labels: Set<string>;
      participants: ActivityParticipantSummary[];
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
      entry.participants.push({
        label,
        isChild: Boolean(p.child),
        groupId: p.groupMembership?.activityGroupId ?? null,
      });
    } else {
      grouped.set(key, {
        activity: p.activity,
        labels: new Set([label]),
        participants: [
          {
            label,
            isChild: Boolean(p.child),
            groupId: p.groupMembership?.activityGroupId ?? null,
          },
        ],
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
        participants: [],
      });
    }
  }

  const professorActivityIds = new Set(
    professorAssignments.map((a) => a.activity.id)
  );

  const items = Array.from(grouped.values()).map((entry) => {
    const isProfessor = professorActivityIds.has(entry.activity.id);
    const rawSessions = sessionsByActivity.get(entry.activity.id) ?? [];

    const groupIds = new Set(
      entry.participants
        .map((participant) => participant.groupId)
        .filter((groupId): groupId is string => Boolean(groupId))
    );
    const hasUngroupedParticipant = entry.participants.some(
      (participant) => participant.groupId === null
    );

    const sessions = isProfessor
      ? rawSessions
      : rawSessions.filter((sessionItem) => {
          if (sessionItem.activityGroupId === null) {
            return hasUngroupedParticipant;
          }

          return groupIds.has(sessionItem.activityGroupId);
        });

    return {
      activity: entry.activity,
      labels: Array.from(entry.labels),
      participants: entry.participants,
      sessions,
      isProfessor,
    };
  });

  const resolvedSearchParams = await searchParams;
  const requestedTab = resolvedSearchParams?.tab;
  const selectedTab = requestedTab === 'old' ? 'old' : 'current';
  const today = new Date(new Date().setHours(0, 0, 0, 0));

  const currentItems = items.filter(({ sessions }) =>
    sessions.some((sessionItem) => new Date(sessionItem.date) >= today)
  );
  const oldItems = items.filter(
    ({ sessions }) =>
      !sessions.some((sessionItem) => new Date(sessionItem.date) >= today)
  );
  const visibleItems = selectedTab === 'old' ? oldItems : currentItems;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Mis actividades
        </h1>
        <p className="text-sm text-muted-foreground">
          {isProfessorView
            ? 'Actividades en las que estás asignado como profesor.'
            : 'Actividades en las que estás inscripto vos o alguien de tu familia.'}
        </p>
      </div>

      <ActivityCalendar
        activityDays={calendarDays}
        variant={isProfessorView ? 'professor-agenda' : 'month'}
      />

      <div className="mt-6 space-y-4">
        <div className="inline-flex rounded-lg border bg-muted/30 p-1">
          <Link
            href="/my-activities"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedTab === 'current'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Actuales ({currentItems.length})
          </Link>
          <Link
            href="/my-activities?tab=old"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedTab === 'old'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Antiguas ({oldItems.length})
          </Link>
        </div>

        {visibleItems.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p>
              {selectedTab === 'old'
                ? 'No tenés actividades antiguas.'
                : 'Todavía no tenés actividades actuales.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {visibleItems.map(
              ({ activity, labels, participants, sessions, isProfessor }) => (
                <li
                  key={activity.id}
                  className="rounded-xl border bg-card p-5 shadow-sm space-y-4"
                >
                  <div>
                    <Link
                      href={`/activities/${activity.id}`}
                      prefetch={true}
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

                  {sessions.length > 0 && (
                    <div className="space-y-2 border-t pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Próximas sesiones
                      </p>
                      <ul className="space-y-2">
                        {sessions.map((s) => {
                          const sessionParticipantNames = Array.from(
                            new Set(
                              (s.activityGroupId
                                ? participants.filter(
                                    (participant) =>
                                      participant.isChild &&
                                      participant.groupId === s.activityGroupId
                                  )
                                : participants
                              ).map((participant) => participant.label)
                            )
                          );
                          const mapHref =
                            s.latitude != null && s.longitude != null
                              ? `https://www.google.com/maps?q=${s.latitude},${s.longitude}`
                              : null;
                          const mapEmbedSrc =
                            s.latitude != null && s.longitude != null
                              ? `https://www.google.com/maps?q=${s.latitude},${s.longitude}&z=15&output=embed`
                              : null;
                          const dateLabel = new Date(
                            s.date + 'T12:00:00'
                          ).toLocaleDateString('es-AR', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          });
                          return (
                            <li key={s.id}>
                              <details
                                className={`group rounded-lg border px-3 py-2 ${s.cancelled ? 'border-red-200 bg-red-50' : 'bg-muted/40'}`}
                              >
                                <summary className="flex cursor-pointer list-none items-center gap-3">
                                  {s.sportIcon ? (
                                    <Image
                                      src={`/icons/${s.sportIcon}`}
                                      alt=""
                                      width={56}
                                      height={56}
                                      className={`h-14 w-14 shrink-0 object-contain ${s.cancelled ? 'opacity-40' : ''}`}
                                    />
                                  ) : (
                                    <span className="h-14 w-14 shrink-0" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                      <p
                                        className={`text-sm font-medium leading-tight ${s.cancelled ? 'line-through text-muted-foreground' : ''}`}
                                      >
                                        {dateLabel} · {s.schedule}
                                      </p>
                                      {s.groupName && (
                                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                          {s.groupName}
                                        </span>
                                      )}
                                      {s.cancelled && (
                                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                                          Cancelado
                                        </span>
                                      )}
                                      {sessionParticipantNames.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {sessionParticipantNames.map(
                                            (name) => (
                                              <span
                                                key={name}
                                                className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                                              >
                                                {name}
                                              </span>
                                            )
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <p className="truncate text-xs text-muted-foreground">
                                      {s.geoLocation}
                                    </p>
                                  </div>
                                  <span className="text-xs text-link underline-offset-4 group-open:underline">
                                    Ver detalle
                                  </span>
                                </summary>

                                <div className="mt-3 space-y-3 border-t pt-3">
                                  <div className="grid gap-3 md:grid-cols-[1fr_180px] md:items-start">
                                    <div className="space-y-2">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Ubicación
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {s.geoLocation}
                                      </p>
                                      {mapHref && (
                                        <a
                                          href={mapHref}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-block text-xs text-link hover:underline underline-offset-4"
                                        >
                                          Abrir en Google Maps
                                        </a>
                                      )}
                                      {isProfessor && (
                                        <div>
                                          <Link
                                            href={`/activities/${activity.id}/days/${s.id}`}
                                            prefetch={true}
                                            className="inline-flex rounded-full border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                                          >
                                            Ver sesión
                                          </Link>
                                        </div>
                                      )}
                                    </div>

                                    {mapEmbedSrc && (
                                      <div className="overflow-hidden rounded-xl border bg-background">
                                        <iframe
                                          title={`Mapa de ${activity.name}`}
                                          src={mapEmbedSrc}
                                          width="100%"
                                          height="160"
                                          loading="lazy"
                                          className="block w-full"
                                          style={{ border: 0 }}
                                          referrerPolicy="no-referrer-when-downgrade"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </details>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </li>
              )
            )}
          </ul>
        )}
      </div>
    </main>
  );
}
