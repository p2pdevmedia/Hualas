import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import ActivityDaySelector from './activity-day-selector';
import { childAccessWhere } from '@/lib/child-access';

export default async function CreatePickupNoticePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { role: true },
  });

  if (user?.role !== 'MEMBER') {
    redirect('/profile/pickup-notices');
  }

  const children = await prisma.child.findMany({
    where: childAccessWhere((session.user as any).id),
    select: {
      id: true,
      name: true,
    },
  });

  const rawUsers = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
    },
  });

  const users = rawUsers.map((u) => ({
    id: u.id,
    name: u.name || '',
  }));

  // Get future activity days where user's children are enrolled
  const activityDays = await prisma.activityDay.findMany({
    where: {
      date: {
        gt: new Date(),
      },
      activity: {
        participants: {
          some: {
            childId: {
              in: children.map((c) => c.id),
            },
          },
        },
      },
    },
    include: {
      activity: true,
    },
    orderBy: {
      date: 'asc',
    },
  });

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

  if (activityDays.length === 0) {
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
          Selecciona una actividad y un día para crear el aviso
        </p>
      </div>

      <ActivityDaySelector
        activityDays={activityDays}
        childrenList={children}
        users={users}
      />
    </div>
  );
}
