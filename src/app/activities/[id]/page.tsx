import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { getActivityBaseRecordById } from '@/lib/activities/activity-records';
import { prisma } from '@/lib/prisma';
import PaymentHandler from './payment-handler';
import ActivityDaysPanel from './activity-days-panel';
import InscriptosPanel from './inscriptos-panel';
import Image from 'next/image';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface ActivityPageProps {
  params: { id: string };
}

type ActivityDetail = Prisma.ActivityGetPayload<{
  include: {
    participants: {
      include: {
        user: true;
        child: true;
      };
    };
  };
}>;

type ActivityParticipantDetail = ActivityDetail['participants'][number];

function getParticipantName(participant: ActivityParticipantDetail) {
  if (participant.child) {
    return `${participant.child.name}${participant.child.lastName ? ` ${participant.child.lastName}` : ''}`;
  }

  return `${participant.user.name ?? 'Sin nombre'}${participant.user.lastName ? ` ${participant.user.lastName}` : ''}`;
}

function getAgeFromBirthDate(birthDate: Date | null) {
  if (!birthDate) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}
function getParticipantSubtitle(participant: ActivityParticipantDetail) {
  if (participant.child) {
    return `Registrado por ${participant.user.name ?? 'sin nombre'}${participant.user.lastName ? ` ${participant.user.lastName}` : ''}`;
  }

  return participant.user.email;
}

function transformAttendanceList(
  day: {
    attendances: Array<{
      activityParticipantId: string;
      status: string;
      confirmedAt: Date | null;
    }>;
  },
  participantsMap: Map<string, ActivityParticipantDetail>
) {
  return day.attendances.map((attendance) => {
    const participant = participantsMap.get(attendance.activityParticipantId);
    return {
      activityParticipantId: attendance.activityParticipantId,
      status: attendance.status,
      participantName: participant
        ? getParticipantName(participant)
        : 'Unknown',
      registeredUserId: participant?.user.id || '',
    };
  });
}

export default async function ActivityPage({ params }: ActivityPageProps) {
  const session = await getServerSession(authOptions);
  const isAdmin =
    session?.user.role === 'ADMIN' || session?.user.role === 'SUPER_ADMIN';
  const isProfessor = session?.user.role === 'PROFESSOR';

  const activity = await getActivityBaseRecordById(params.id);

  if (!activity) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center text-muted-foreground font-body">
        Actividad no encontrada
      </main>
    );
  }

  const [
    participants,
    activityProfessors,
    professorOptions,
    activityGroups,
    days,
    pickupNoticesByDay,
  ] = await Promise.all([
    prisma.activityParticipant
      .findMany({
        where: { activityId: activity.id },
        include: {
          user: true,
          child: true,
          groupMembership: {
            select: {
              activityGroupId: true,
            },
          },
        },
      })
      .catch((error) => {
        console.error('[activity-page] participants query failed', error);
        return [];
      }),
    prisma.activityProfessor
      .findMany({
        where: { activityId: activity.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastName: true,
            },
          },
        },
      })
      .catch((error) => {
        console.error('[activity-page] professors query failed', error);
        return [];
      }),
    prisma.user
      .findMany({
        where: {
          roleAssignments: { some: { role: 'PROFESSOR' } },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          lastName: true,
          email: true,
        },
        orderBy: [{ name: 'asc' }, { lastName: 'asc' }],
      })
      .catch((error) => {
        console.error('[activity-page] professor options query failed', error);
        return [];
      }),
    prisma.activityGroup
      .findMany({
        where: { activityId: activity.id },
        orderBy: { createdAt: 'asc' },
        include: {
          _count: {
            select: {
              members: true,
              days: true,
            },
          },
        },
      })
      .catch((error) => {
        console.error('[activity-page] activity groups query failed', error);
        return [];
      }),
    prisma.activityDay
      .findMany({
        where: { activityId: activity.id },
        orderBy: { date: 'asc' },
        include: {
          professors: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          activityGroup: {
            select: {
              id: true,
              name: true,
            },
          },
          attendances: {
            select: {
              activityParticipantId: true,
              status: true,
              confirmedAt: true,
            },
          },
        },
      })
      .catch((error) => {
        console.error('[activity-page] days query failed', error);
        return [];
      }),
    prisma.activityDay
      .findMany({
        where: { activityId: activity.id },
        include: {
          pickupNotices: {
            where: { deletedAt: null },
            include: {
              child: {
                include: {
                  user: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
              createdBy: {
                select: {
                  name: true,
                },
              },
              alternatePersonUser: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      })
      .catch((error) => {
        console.error('[activity-page] pickup notices query failed', error);
        return [];
      }),
  ]);

  if (
    isProfessor &&
    !activityProfessors.some((prof) => prof.userId === session?.user.id)
  ) {
    redirect('/');
  }

  // Create a map of participants for quick lookup
  const participantsMap = new Map(participants.map((p) => [p.id, p]));

  // Create a map of pickup notices by dayId
  const pickupNoticesMap = new Map(
    pickupNoticesByDay.map((day: any) => [day.id, day.pickupNotices])
  );

  // Transform days data to include attendanceList and pickupNotices
  const daysWithAttendance = days.map((day) => ({
    ...day,
    attendanceList: transformAttendanceList(day, participantsMap),
    pickupNotices: pickupNoticesMap.get(day.id) || [],
  }));

  const activityTypeLabels: Record<string, string> = {
    TEMPORARY: 'Temporal',
    ANNUAL: 'Anual',
  };
  const activityDateRange = `${activity.date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}${
    activity.date.toISOString().slice(0, 10) ===
    activity.endDate.toISOString().slice(0, 10)
      ? ''
      : ` al ${activity.endDate.toLocaleDateString('es-AR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}`
  }`;
  const enrolledCount = participants.length;
  const activityProfessorIds = activityProfessors.map(
    (assignment: { userId: string }) => assignment.userId
  );
  const activityGroupById = new Map(
    activityGroups.map((group: any) => [group.id, group.name])
  );
  const capacity =
    activityGroups.length === 0 || activityGroups.some((g: any) => g.capacity == null)
      ? null
      : activityGroups.reduce((sum: number, g: any) => sum + g.capacity, 0);
  const hasCapacity = capacity != null;
  const canManageDays = isAdmin;

  let registrations: Array<{
    id: string;
    label: string;
    groupId: string | null;
    groupName: string | null;
  }> = [];

  if (session) {
    const activityParticipants = participants.filter((participant: any) => {
      const isOwner = participant.userId === session.user.id;
      const childOwner = participant.child?.userId === session.user.id;
      return isOwner || childOwner;
    });

    registrations = activityParticipants.map((participant: any) => ({
      id: participant.id,
      label: participant.child
        ? `${participant.child.name}${participant.child.lastName ? ` ${participant.child.lastName}` : ''}`
        : (session.user.name ?? 'Yo'),
      groupId: participant.groupMembership?.activityGroupId ?? null,
      groupName: participant.groupMembership?.activityGroupId
        ? (activityGroupById.get(participant.groupMembership.activityGroupId) ??
          null)
        : null,
    }));
  }

  const isParticipantInActivity = registrations.length > 0;
  const canSeeSessions = isAdmin || isProfessor || isParticipantInActivity;
  const hideSessionDetails = activity.activityType === 'ANNUAL';
  const hideSessionList =
    activity.activityType === 'ANNUAL' || activity.activityType === 'TEMPORARY';
  const activityListHref = isParticipantInActivity
    ? '/my-activities'
    : '/activities';
  const activityListLabel = isParticipantInActivity
    ? 'Mis actividades'
    : 'Actividades';

  const professorLabels = activityProfessors.map((assignment: any) => {
    const professor = assignment.user;
    return `${professor.name ?? 'Sin nombre'}${professor.lastName ? ` ${professor.lastName}` : ''}`;
  });
  const activityGroupOptions = activityGroups.map((group: any) => ({
    id: group.id,
    name: group.name,
    capacity: group.capacity,
    minAge: group.minAge,
    maxAge: group.maxAge,
  }));

  return (
    <main>
      <Suspense fallback={null}>
        <PaymentHandler activityId={activity.id} />
      </Suspense>

      {/* Hero foto */}
      {activity.image ? (
        <div className="relative w-full h-52 overflow-hidden">
          <Image
            src={`/api/activities/${activity.id}/image`}
            alt={activity.name}
            fill
            unoptimized
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      ) : (
        <div
          className="w-full h-52"
          style={{
            background: 'linear-gradient(135deg, #1C2117 0%, #49BDA6 100%)',
          }}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted-foreground mb-5 font-body flex items-center gap-1">
          <Link
            href={activityListHref}
            className="hover:text-primary transition-colors"
          >
            {activityListLabel}
          </Link>
          <span>→</span>
          <span className="text-foreground">{activity.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-8 items-start">
          {/* Columna izquierda */}
          <div className="space-y-6">
            <div>
              <h1 className="font-heading text-3xl sm:text-4xl font-semibold leading-tight">
                {activity.name}
              </h1>
              {activity.description && (
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed font-body">
                  {activity.description}
                </p>
              )}
            </div>

            {/* Grid de detalles 2×2 */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: 'Tipo',
                  value:
                    activityTypeLabels[activity.activityType] ??
                    activity.activityType,
                },
                { label: 'Precio', value: `$${activity.price}` },
                {
                  label: 'Inscriptos',
                  value: `${enrolledCount} personas`,
                },
                {
                  label: 'Cupo',
                  value: hasCapacity ? `${capacity} lugares` : 'Ilimitado',
                },
                activityProfessors.length > 0 && {
                  label: 'Profesores',
                  value: professorLabels.join(', '),
                },
                activity.date && {
                  label: 'Período',
                  value: activityDateRange,
                },
              ]
                .filter(Boolean)
                .map((item: any) => (
                  <div
                    key={item.label}
                    className="rounded-lg border bg-card p-4"
                  >
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-body mb-1">
                      {item.label}
                    </p>
                    <p className="font-heading text-lg font-semibold">
                      {item.value}
                    </p>
                  </div>
                ))}
            </div>

            {isAdmin && (
              <Link
                href={`/activities/${activity.id}/edit`}
                className="inline-block text-sm text-link hover:text-link/80 underline underline-offset-4 font-body"
              >
                Editar actividad
              </Link>
            )}
          </div>
        </div>

        {canSeeSessions && (
          <ActivityDaysPanel
            activityId={activity.id}
            canManageDays={canManageDays}
            hideSessionDetails={hideSessionDetails}
            hideSessionList={hideSessionList}
            professors={professorOptions}
            groups={activityGroupOptions}
            defaultProfessorIds={activityProfessorIds}
            registrations={registrations}
            days={daysWithAttendance
              .filter((day: any) => {
                if (isAdmin) return true;
                if (isProfessor) {
                  return day.professors.some(
                    (assignment: { userId: string }) =>
                      assignment.userId === session?.user.id
                  );
                }
                return true;
              })
              .map((day: any) => ({
                id: day.id,
                date: day.date.toISOString(),
                schedule: day.schedule,
                description: day.description,
                geoLocation: day.geoLocation,
                latitude: day.latitude,
                longitude: day.longitude,
                activityGroupId: day.activityGroupId,
                sportIcon: day.sportIcon,
                activityGroup: day.activityGroup,
                canEdit: isAdmin,
                canEditDescription:
                  isProfessor &&
                  day.professors.some(
                    (a: { userId: string }) => a.userId === session?.user.id
                  ),
                assignedProfessors: day.professors.map((assignment: any) => ({
                  id: assignment.user.id,
                  name: assignment.user.name,
                  lastName: assignment.user.lastName,
                  email: assignment.user.email,
                })),
                attendances: day.attendances.map((attendance: any) => ({
                  activityParticipantId: attendance.activityParticipantId,
                  status: attendance.status,
                  confirmedAt: attendance.confirmedAt
                    ? attendance.confirmedAt.toISOString()
                    : null,
                })),
                attendanceList: day.attendanceList,
                pickupNotices: day.pickupNotices || [],
              }))}
          />
        )}

        {isAdmin && activityGroupOptions.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {activityGroupOptions.map((group) => (
              <Link
                key={group.id}
                href={`/activities/${activity.id}/groups/${group.id}`}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                {group.name}
              </Link>
            ))}
          </div>
        )}

        {(isAdmin || isProfessor) && (
          <InscriptosPanel
            participants={(participants as any[]).map((p) => ({
              id: p.id,
              name: getParticipantName(p),
              subtitle: getParticipantSubtitle(p),
              age: getAgeFromBirthDate(
                p.child ? p.child.birthDate : p.user.birthDate
              ),
              receipt: p.receipt ?? null,
              receiptDate: p.receiptDate ? p.receiptDate.toISOString() : null,
              isChild: !!p.child,
              groupId: p.groupMembership?.activityGroupId ?? null,
              groupName: p.groupMembership?.activityGroupId
                ? (activityGroupById.get(p.groupMembership.activityGroupId) ??
                  null)
                : null,
              whatsappPhone: p.user.phone ?? null,
              detailHref: `/activities/${activity.id}/participants/${p.id}`,
            }))}
            groups={activityGroupOptions}
            canAssignGroups={isAdmin}
            enrolledCount={enrolledCount}
            capacity={capacity}
          />
        )}
      </div>
    </main>
  );
}
