import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import RoleSwitchPrompt from '@/components/role-switch-prompt';
import { hasProfessorCapability } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import {
  checkChildProfile,
  checkUserProfile,
} from '@/lib/participant-profile-check';
import ActivityCalendar, {
  type CalendarActivityDay,
} from './activity-calendar';

type MyActivitiesPageProps = {
  searchParams?: {
    participant?: string | string[];
  };
};

function formatParticipantName(
  name: string | null | undefined,
  lastName: string | null | undefined,
  fallback: string
) {
  return [name, lastName].filter(Boolean).join(' ') || fallback;
}

export default async function MyActivitiesPage({
  searchParams,
}: MyActivitiesPageProps) {
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
  const accessibleChildOwnerIds = await getAccessibleChildOwnerIds(userId);
  const [profileForCheck, familyChildren] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        lastName: true,
        dni: true,
        birthDate: true,
        address: true,
        phone: true,
      },
    }),
    prisma.child.findMany({
      where: { userId: { in: accessibleChildOwnerIds } },
      select: {
        id: true,
        name: true,
        lastName: true,
        documentNumber: true,
        birthDate: true,
        address: true,
      },
      orderBy: [{ userId: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  if (!profileForCheck) {
    redirect('/login');
  }

  const adultResponsibleLabel = formatParticipantName(
    profileForCheck.name,
    profileForCheck.lastName,
    session.user.name ?? 'Yo'
  );
  const participantFilterOptions = [
    { key: 'all', label: 'Todos' },
    { key: 'self', label: adultResponsibleLabel },
    ...familyChildren.map((child) => ({
      key: `child:${child.id}`,
      label: formatParticipantName(child.name, child.lastName, child.name),
    })),
  ];
  const rawParticipantFilter = Array.isArray(searchParams?.participant)
    ? searchParams?.participant[0]
    : searchParams?.participant;
  const selectedParticipantFilter =
    !isProfessorView &&
    rawParticipantFilter &&
    participantFilterOptions.some(
      (option) => option.key === rawParticipantFilter
    )
      ? rawParticipantFilter
      : 'all';

  const missingProfileTargets = [
    {
      key: 'self',
      label: 'tu perfil',
      href: '/profile?returnTo=/my-activities&onboarding=1',
      check: checkUserProfile(profileForCheck),
    },
    ...familyChildren.map((child) => ({
      key: child.id,
      label: `${child.name}${child.lastName ? ` ${child.lastName}` : ''}`,
      href: `/profile/children/${child.id}/edit?returnTo=/my-activities`,
      check: checkChildProfile(child, profileForCheck.phone),
    })),
  ].filter((target) => !target.check.valid);
  const firstMissingProfileTarget = missingProfileTargets[0] ?? null;

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
      participations = await prisma.activityParticipant.findMany({
        where: {
          status: 'ACTIVE',
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

  const visibleParticipations =
    selectedParticipantFilter === 'all'
      ? participations
      : participations.filter((participation) => {
          if (selectedParticipantFilter === 'self') {
            return participation.childId === null;
          }

          return participation.childId === selectedParticipantFilter.slice(6);
        });

  const activityIds = [
    ...new Set([
      ...visibleParticipations.map((p) => p.activity.id),
      ...professorAssignments.map((a) => a.activity.id),
    ]),
  ];

  const participantScopeByActivity = new Map<
    string,
    { groupIds: Set<string>; hasUngroupedParticipant: boolean }
  >();
  for (const participation of visibleParticipations) {
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const sixMonthsLater = new Date(today);
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      const raw = await prisma.activityDay.findMany({
        where: {
          activityId: { in: activityIds },
          date: {
            gte: oneWeekAgo,
            lte: sixMonthsLater,
          },
          ...(isProfessorView
            ? {
                OR: [
                  { activityGroup: { professors: { some: { userId } } } },
                  {
                    activityGroupId: null,
                    activity: { professors: { some: { userId } } },
                  },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          date: true,
          schedule: true,
          geoLocation: true,
          description: true,
          sportIcon: true,
          latitude: true,
          longitude: true,
          activityGroupId: true,
          cancelled: true,
          activity: {
            select: {
              id: true,
              name: true,
              professors: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      lastName: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
          activityGroup: {
            select: {
              name: true,
              professors: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      lastName: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
          attendances: {
            select: { activityParticipantId: true, status: true },
          },
        },
        orderBy: { date: 'asc' },
      });
      calendarDays = raw
        .filter((d) => {
          if (isProfessorView) return true;
          const scope = participantScopeByActivity.get(d.activity.id);
          if (!scope) return false;
          if (d.activityGroupId === null) return true;
          return scope.groupIds.has(d.activityGroupId);
        })
        .map((d) => {
          const attendanceStatusByParticipant = new Map(
            d.attendances.map((attendance) => [
              attendance.activityParticipantId,
              attendance.status,
            ])
          );
          const visibleParticipants = isProfessorView
            ? []
            : visibleParticipations.filter((participant) => {
                if (participant.activity.id !== d.activity.id) return false;
                const participantGroupId =
                  participant.groupMembership?.activityGroupId ?? null;

                if (d.activityGroupId === null) return true;
                return participantGroupId === d.activityGroupId;
              });

          return {
            id: d.id,
            date: d.date.toISOString().slice(0, 10),
            activityId: d.activity.id,
            activityName: isProfessorView
              ? (d.activityGroup?.name ?? d.activity.name)
              : d.activity.name,
            schedule: d.schedule,
            geoLocation: d.geoLocation,
            description: d.description,
            sportIcon: d.sportIcon,
            latitude: d.latitude,
            longitude: d.longitude,
            activityGroupName: d.activityGroup?.name ?? null,
            cancelled: d.cancelled,
            professors: (
              d.activityGroup?.professors ?? d.activity.professors
            ).map((assignment) => ({
              id: assignment.user.id,
              label: `${assignment.user.name ?? 'Sin nombre'}${assignment.user.lastName ? ` ${assignment.user.lastName}` : ''}`,
              phone: assignment.user.phone,
            })),
            attendanceOptions: visibleParticipants.map((participant) => {
              const label = participant.child
                ? `${participant.child.name}${participant.child.lastName ? ` ${participant.child.lastName}` : ''}`
                : adultResponsibleLabel;

              return {
                participantId: participant.id,
                label,
                status:
                  attendanceStatusByParticipant.get(participant.id) ??
                  'PENDING',
              };
            }),
          };
        });
    } catch {
      calendarDays = [];
    }
  }

  const grouped = new Map<
    string,
    {
      activity: (typeof participations)[number]['activity'];
      labels: Set<string>;
    }
  >();

  for (const p of visibleParticipations) {
    const key = p.activity.id;
    const label = p.child
      ? `${p.child.name}${p.child.lastName ? ` ${p.child.lastName}` : ''}`
      : adultResponsibleLabel;
    const entry = grouped.get(key);
    if (entry) {
      entry.labels.add(label);
    } else {
      grouped.set(key, {
        activity: p.activity,
        labels: new Set([label]),
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
      });
    }
  }

  const activityTags = Array.from(grouped.values()).map((entry) => ({
    activity: entry.activity,
    labels: Array.from(entry.labels),
  }));
  const isSelfParticipantAgenda =
    !isProfessorView && selectedParticipantFilter === 'self';

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Mis actividades
        </h1>
        {activityTags.length > 0 && (
          <nav
            aria-label={
              isProfessorView
                ? 'Actividades asignadas'
                : 'Actividades inscriptas'
            }
            className="mt-3 flex flex-wrap gap-2"
          >
            {activityTags.map(({ activity, labels }) => (
              <Link
                key={activity.id}
                href={`/activities/${activity.id}`}
                prefetch={true}
                className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:border-primary hover:bg-primary/15 hover:text-primary"
                title={labels.join(', ')}
              >
                {activity.name}
              </Link>
            ))}
          </nav>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          {isProfessorView
            ? 'Actividades en las que estás asignado como profesor.'
            : 'Actividades en las que estás inscripto vos o alguien de tu familia.'}
        </p>
        {!isProfessorView && participantFilterOptions.length > 1 && (
          <div className="mt-4 rounded-xl border bg-card p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Filtrar por participante
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {participantFilterOptions.map((option) => {
                const isSelected = option.key === selectedParticipantFilter;
                const href =
                  option.key === 'all'
                    ? '/my-activities'
                    : `/my-activities?participant=${encodeURIComponent(option.key)}`;

                return (
                  <Link
                    key={option.key}
                    href={href}
                    prefetch={true}
                    aria-current={isSelected ? 'page' : undefined}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {firstMissingProfileTarget && (
        <div className="sticky top-20 z-30 mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-semibold">Hay datos pendientes</p>
              <p>
                Para completar inscripciones, actualizá los datos obligatorios
                de{' '}
                {missingProfileTargets.map((target) => target.label).join(', ')}
                .
              </p>
            </div>
            <Link
              href={firstMissingProfileTarget.href}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-amber-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-amber-800"
            >
              Completar datos
            </Link>
          </div>
        </div>
      )}

      <ActivityCalendar
        activityDays={calendarDays}
        variant={isProfessorView ? 'professor-agenda' : 'member-agenda'}
        sessionDetailLabel={isProfessorView ? 'Ver sesión' : 'Ver detalle'}
        compactDayRange={
          isSelfParticipantAgenda ? { pastDays: 1, futureDays: 3 } : undefined
        }
        compactCalendarSize={isSelfParticipantAgenda ? 'large' : 'normal'}
        compactInitialScroll="today"
      />
    </main>
  );
}
