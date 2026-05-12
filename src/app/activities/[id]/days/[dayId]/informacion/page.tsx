import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { gateActiveRole } from '@/lib/role-guards';
import Link from 'next/link';
import DayParticipantContactCard from './day-participant-contact-card';

export default async function DayGroupInfoPage({
  params,
}: {
  params: { id: string; dayId: string };
}) {
  const session = await getServerSession(authOptions);
  const block = gateActiveRole(session, ['ADMIN', 'PROFESSOR']);
  if (block) return block;

  const activeRole = session!.user.activeRole ?? session!.user.role;
  const isProfessor = activeRole === 'PROFESSOR';

  const day = await prisma.activityDay.findUnique({
    where: { id: params.dayId },
    select: {
      id: true,
      activityId: true,
      date: true,
      schedule: true,
      geoLocation: true,
      activityGroupId: true,
      activity: { select: { id: true, name: true } },
      activityGroup: { select: { id: true, name: true } },
      professors: { select: { userId: true } },
    },
  });

  if (!day || day.activityId !== params.id) redirect('/my-activities');

  if (
    isProfessor &&
    !day.professors.some((p) => p.userId === session!.user.id)
  ) {
    redirect('/my-activities');
  }

  const allParticipants = await prisma.activityParticipant.findMany({
    where: { activityId: params.id, status: 'ACTIVE' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      child: {
        select: {
          name: true,
          lastName: true,
          user: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      groupMembership: { select: { activityGroupId: true } },
      reports: {
        where: { activityDayId: params.dayId },
        select: { body: true },
        take: 1,
      },
    },
    orderBy: { id: 'asc' },
  });

  const participants = day.activityGroupId
    ? allParticipants.filter(
        (p) => p.groupMembership?.activityGroupId === day.activityGroupId
      )
    : allParticipants;

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
        <span className="text-foreground">Información</span>
      </nav>

      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold">
          Información de contacto
        </h1>
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

      {participants.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay inscriptos para este grupo.
        </p>
      ) : (
        <div className="space-y-3">
          {participants.map((p) => {
            const isChild = !!p.child;
            const displayName = isChild
              ? `${p.child!.name}${p.child!.lastName ? ` ${p.child!.lastName}` : ''}`
              : `${p.user.name ?? ''}${p.user.lastName ? ` ${p.user.lastName}` : ''}`.trim() ||
                'Sin nombre';
            const contact = isChild ? p.child!.user : p.user;
            const contactName =
              `${contact.name ?? ''}${contact.lastName ? ` ${contact.lastName}` : ''}`.trim();

            return (
              <DayParticipantContactCard
                key={p.id}
                activityId={day.activity.id}
                dayId={day.id}
                participant={{
                  id: p.id,
                  displayName,
                  isChild,
                  contactName,
                  contactUserId: contact.id,
                  email: contact.email,
                  phone: contact.phone,
                  existingReport: p.reports[0]?.body ?? null,
                }}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
