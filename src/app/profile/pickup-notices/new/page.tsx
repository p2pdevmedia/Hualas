import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import { isActiveMember } from '@/lib/roles';
import { formatFullName } from '@/lib/mobile-format';
import PickupNoticeWizard from './pickup-notice-wizard';

export default async function CreatePickupNoticePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  if (!isActiveMember(session)) {
    redirect('/profile/pickup-notices');
  }

  const ownerIds = await getAccessibleChildOwnerIds((session.user as any).id);
  const children = await prisma.child.findMany({
    where: { userId: { in: ownerIds } },
    select: {
      id: true,
      name: true,
      lastName: true,
    },
  });

  const now = new Date();
  const childIds = children.map((c) => c.id);
  const activeParticipants =
    childIds.length > 0
      ? await prisma.activityParticipant.findMany({
          where: {
            childId: { in: childIds },
            status: 'ACTIVE',
          },
          select: {
            childId: true,
            activityId: true,
            groupMembership: {
              select: {
                activityGroupId: true,
              },
            },
          },
        })
      : [];

  const activityIds = Array.from(
    new Set(activeParticipants.map((participant) => participant.activityId))
  );
  const activityDays =
    activityIds.length > 0
      ? await prisma.activityDay.findMany({
          where: {
            date: {
              gt: now,
            },
            cancelled: false,
            activityId: {
              in: activityIds,
            },
          },
          include: {
            activity: true,
          },
          orderBy: {
            date: 'asc',
          },
        })
      : [];

  const participantIndex = new Map<string, Map<string, Set<string | null>>>();

  for (const participant of activeParticipants) {
    const childId = participant.childId;
    if (!childId) {
      continue;
    }

    const childMap =
      participantIndex.get(childId) ?? new Map<string, Set<string | null>>();
    const activityGroups =
      childMap.get(participant.activityId) ?? new Set<string | null>();
    activityGroups.add(participant.groupMembership?.activityGroupId ?? null);
    childMap.set(participant.activityId, activityGroups);
    participantIndex.set(childId, childMap);
  }

  const eligibleActivityDays = activityDays
    .map((day) => ({
      ...day,
      eligibleChildIds: childIds.filter((childId) => {
        const childActivities = participantIndex.get(childId);
        const groupIds = childActivities?.get(day.activityId);
        if (!childActivities || !groupIds || groupIds.size === 0) {
          return false;
        }

        if (!day.activityGroupId) {
          return true;
        }

        return groupIds.has(day.activityGroupId);
      }),
    }))
    .filter((day) => day.eligibleChildIds.length > 0)
    .map((day) => ({
      id: day.id,
      date: day.date.toISOString(),
      schedule: day.schedule,
      activity: {
        id: day.activity.id,
        name: day.activity.name,
      },
      eligibleChildIds: day.eligibleChildIds,
    }));

  if (children.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight mb-2">
            Crear aviso de retiro
          </h1>
          <p className="text-muted-foreground mb-6">
            No tenés hijos registrados. Primero debes agregar un hijo a tu
            perfil.
          </p>
          <Link href="/profile">
            <Button>Volver al perfil</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (eligibleActivityDays.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight mb-2">
            Crear aviso de retiro
          </h1>
          <p className="text-muted-foreground mb-6">
            No hay actividades futuras donde tus hijos estén anotados.
          </p>
          <Link href="/profile/pickup-notices">
            <Button>Volver a avisos</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Crear aviso de retiro
        </h1>
        <p className="text-sm text-muted-foreground">
          Primero elegí para quién es el aviso y después el sistema te muestra
          solo las actividades, días y horarios habilitados.
        </p>
      </div>

      <PickupNoticeWizard
        activityDays={eligibleActivityDays}
        childrenList={children.map((child) => ({
          id: child.id,
          name: formatFullName(child),
        }))}
      />
    </div>
  );
}
