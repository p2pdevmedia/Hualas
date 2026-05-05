import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { gateActiveRole } from '@/lib/role-guards';
import ActivityGroupMembersManager from './group-members-manager';

interface ActivityGroupPageProps {
  params: { id: string; groupId: string };
}

type ParticipantRow = {
  participantId: string;
  label: string;
  subtitle: string;
  currentGroupId: string | null;
  currentGroupName: string | null;
};

function formatName(name: string | null, lastName: string | null) {
  return `${name ?? 'Sin nombre'}${lastName ? ` ${lastName}` : ''}`;
}

export default async function ActivityGroupPage({
  params,
}: ActivityGroupPageProps) {
  const session = await getServerSession(authOptions);
  const block = gateActiveRole(session, ['ADMIN', 'PROFESSOR']);
  if (block) return block;

  const [activity, activityProfessors] = await Promise.all([
    prisma.activity.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.activityProfessor
      .findMany({
        where: { activityId: params.id },
        select: {
          userId: true,
        },
      })
      .catch((error) => {
        console.error('[activity-group-page] professors query failed', error);
        return [];
      }),
  ]);

  if (!activity) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 text-center text-muted-foreground font-body">
        Actividad no encontrada
      </main>
    );
  }

  const isAdmin = session!.user.role === 'ADMIN';
  const canManageGroup =
    isAdmin ||
    activityProfessors.some(
      (assignment) => assignment.userId === session!.user.id
    );

  if (!canManageGroup) {
    redirect('/');
  }

  const [group, activityGroups, participants] = await Promise.all([
    prisma.activityGroup.findFirst({
      where: {
        id: params.groupId,
        activityId: activity.id,
      },
      include: {
        _count: {
          select: {
            members: true,
            days: true,
          },
        },
      },
    }),
    prisma.activityGroup.findMany({
      where: { activityId: activity.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.activityParticipant
      .findMany({
        where: { activityId: activity.id },
        include: {
          user: {
            select: {
              name: true,
              lastName: true,
              email: true,
            },
          },
          child: {
            select: {
              name: true,
              lastName: true,
              userId: true,
            },
          },
          groupMembership: {
            select: {
              activityGroupId: true,
              activityGroup: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      })
      .catch((error) => {
        console.error('[activity-group-page] participants query failed', error);
        return [];
      }),
  ]);

  if (!group) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 text-center text-muted-foreground font-body">
        Grupo no encontrado
      </main>
    );
  }

  const allParticipants = participants
    .map((participant): ParticipantRow => {
      const label = participant.child
        ? formatName(participant.child.name, participant.child.lastName)
        : formatName(participant.user.name, participant.user.lastName);

      const subtitle = participant.child
        ? `Registrado por ${formatName(
            participant.user.name,
            participant.user.lastName
          )}`
        : participant.user.email;

      return {
        participantId: participant.id,
        label,
        subtitle,
        currentGroupId: participant.groupMembership?.activityGroupId ?? null,
        currentGroupName:
          participant.groupMembership?.activityGroup?.name ?? null,
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label, 'es'));

  const currentMembers = allParticipants.filter(
    (participant) => participant.currentGroupId === group.id
  );
  const availableParticipants = allParticipants.filter(
    (participant) => participant.currentGroupId !== group.id
  );

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <nav className="text-xs text-muted-foreground font-body flex flex-wrap items-center gap-1">
        <Link
          href="/activities"
          className="hover:text-primary transition-colors"
        >
          Actividades
        </Link>
        <span>→</span>
        <Link
          href={`/activities/${activity.id}`}
          className="hover:text-primary transition-colors"
        >
          {activity.name}
        </Link>
        <span>→</span>
        <span className="text-foreground">{group.name}</span>
      </nav>

      <section className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-semibold">
              {group.name}
            </h1>
            {group.description && (
              <p className="mt-2 text-sm text-muted-foreground font-body">
                {group.description}
              </p>
            )}
          </div>
          <Link
            href={`/activities/${activity.id}`}
            className="inline-flex items-center justify-center rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
          >
            Volver a la actividad
          </Link>
          <Link
            href={`/activities/${activity.id}/groups/${group.id}/edit`}
            prefetch={true}
            className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Editar grupo
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Miembros
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {group._count.members}
              {group.capacity != null ? ` / ${group.capacity}` : ''}
            </p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Actividad
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {activity.name}
            </p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Edades
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {group.minAge != null && group.maxAge != null
                ? `${group.minAge} a ${group.maxAge} años`
                : 'Sin rango cargado'}
            </p>
          </div>
        </div>
      </section>

      <ActivityGroupMembersManager
        groupId={group.id}
        groupName={group.name}
        members={currentMembers}
        availableParticipants={availableParticipants}
        allGroups={activityGroups}
      />
    </main>
  );
}
