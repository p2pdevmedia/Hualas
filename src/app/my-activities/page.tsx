import Link from 'next/link';
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

export default async function MyActivitiesPage() {
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
          description: true,
          sportIcon: true,
          latitude: true,
          longitude: true,
          activityGroupId: true,
          cancelled: true,
          activity: { select: { id: true, name: true } },
          activityGroup: { select: { name: true } },
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
            : participations.filter((participant) => {
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
            cancelled: d.cancelled,
            attendanceOptions: visibleParticipants.map((participant) => {
              const label = participant.child
                ? `${participant.child.name}${participant.child.lastName ? ` ${participant.child.lastName}` : ''}`
                : (session.user.name ?? 'Yo');

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

  for (const p of participations) {
    const key = p.activity.id;
    const label = p.child
      ? `${p.child.name}${p.child.lastName ? ` ${p.child.lastName}` : ''}`
      : (session.user.name ?? 'Yo');
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
      </div>

      <ActivityCalendar
        activityDays={calendarDays}
        variant={isProfessorView ? 'professor-agenda' : 'member-agenda'}
      />
    </main>
  );
}
