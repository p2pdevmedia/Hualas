import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { gateActiveRole } from '@/lib/role-guards';
import { isUserAssignedToActivityDay } from '@/lib/activity-day-professors';
import Link from 'next/link';
import AttendanceManager from './attendance-manager';

export default async function DayAttendancePage({
  params,
}: {
  params: { id: string; dayId: string };
}) {
  const session = await getServerSession(authOptions);
  const block = gateActiveRole(session, ['ADMIN', 'PROFESSOR']);
  if (block) return block;

  const isAdmin = session!.user.role === 'ADMIN';
  const isProfessor = session!.user.role === 'PROFESSOR';

  const day = await prisma.activityDay.findUnique({
    where: { id: params.dayId },
    include: {
      activity: { select: { id: true, name: true } },
      activityGroup: { select: { id: true, name: true } },
      attendances: {
        select: { activityParticipantId: true, status: true },
      },
    },
  });

  if (!day || day.activityId !== params.id) redirect('/my-activities');

  if (
    isProfessor &&
    !(await isUserAssignedToActivityDay(day.id, session!.user.id))
  ) {
    redirect('/my-activities');
  }

  const allParticipants = await prisma.activityParticipant.findMany({
    where: { activityId: params.id, status: 'ACTIVE' },
    include: {
      user: { select: { name: true, lastName: true } },
      child: { select: { name: true, lastName: true } },
      groupMembership: { select: { activityGroupId: true } },
    },
    orderBy: { id: 'asc' },
  });

  const participants = day.activityGroupId
    ? allParticipants.filter(
        (p) => p.groupMembership?.activityGroupId === day.activityGroupId
      )
    : allParticipants;

  const attendanceMap = new Map(
    day.attendances.map((a) => [a.activityParticipantId, a.status])
  );

  const participantList = participants.map((p) => {
    const name = p.child
      ? `${p.child.name}${p.child.lastName ? ` ${p.child.lastName}` : ''}`
      : `${p.user.name ?? ''}${p.user.lastName ? ` ${p.user.lastName}` : ''}`.trim();
    return {
      activityParticipantId: p.id,
      participantName: name || 'Sin nombre',
      status: (attendanceMap.get(p.id) ?? 'PENDING') as
        | 'PENDING'
        | 'GOING'
        | 'NOT_GOING',
    };
  });

  const dateLabel = day.date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground font-body">
        <Link
          href="/my-activities"
          prefetch={true}
          className="hover:text-primary transition-colors"
        >
          Mis actividades
        </Link>
        <span>→</span>
        <Link
          href={`/activities/${day.activity.id}/days/${day.id}`}
          prefetch={true}
          className="hover:text-primary transition-colors capitalize"
        >
          {dateLabel}
        </Link>
        <span>→</span>
        <span className="text-foreground">Asistencia</span>
      </nav>

      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold">Asistencia</h1>
        <p className="text-sm text-muted-foreground capitalize">{dateLabel}</p>
        <p className="text-sm text-muted-foreground">
          {day.schedule} · {day.geoLocation}
        </p>
        {day.activityGroup && (
          <p className="text-xs text-muted-foreground">
            Grupo: {day.activityGroup.name}
          </p>
        )}
      </div>

      {participantList.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay inscriptos para esta sesión.
        </p>
      ) : (
        <AttendanceManager dayId={day.id} participants={participantList} />
      )}
    </main>
  );
}
