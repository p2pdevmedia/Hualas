import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { getAccessibleChildrenWhere } from '@/lib/family-access';

export default async function PickupNoticesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { role: true },
  });

  const isProfessor = user?.role === 'PROFESSOR' || user?.role === 'ADMIN';
  const isMember = user?.role === 'MEMBER';

  let where: any = { deletedAt: null };

  if (isMember) {
    const userChildren = await prisma.child.findMany({
      where: await getAccessibleChildrenWhere((session.user as any).id),
      select: { id: true },
    });

    const childIds = userChildren.map((c) => c.id);

    where = {
      deletedAt: null,
      OR: [
        { createdById: (session.user as any).id },
        { childId: { in: childIds } },
      ],
    };
  } else if (isProfessor) {
    const professorActivities = await prisma.activityProfessor.findMany({
      where: { userId: (session.user as any).id },
      select: { activityId: true },
    });

    const activityIds = professorActivities.map((ap) => ap.activityId);

    where = {
      deletedAt: null,
      activityDay: {
        activityId: { in: activityIds },
      },
    };
  }

  const notices = await prisma.pickupNotice.findMany({
    where,
    include: {
      activityDay: {
        include: {
          activity: true,
        },
      },
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
    orderBy: {
      activityDay: {
        date: 'asc',
      },
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Avisos de retiro
            </h1>
            <p className="text-sm text-muted-foreground">
              {isProfessor
                ? 'Notificaciones de quién retirará a los hijos'
                : 'Notifica a los profesores que otra persona retirará a tu hijo'}
            </p>
          </div>
          {isMember && (
            <Link href="/profile/pickup-notices/new">
              <Button>Crear aviso</Button>
            </Link>
          )}
        </div>
      </div>

      {notices.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-muted-foreground mb-4">
            {isProfessor
              ? 'No hay avisos de retiro'
              : 'No tenés avisos de retiro creados'}
          </p>
          {isMember && (
            <Link href="/profile/pickup-notices/new">
              <Button>Crear tu primer aviso</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => {
            const isOwnNotice =
              isProfessor || notice.createdById === (session.user as any).id;
            return (
              <div
                key={notice.id}
                className={`rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow ${
                  !isOwnNotice ? 'border-blue-200 bg-blue-50' : ''
                }`}
              >
                {!isOwnNotice && !isProfessor && (
                  <div className="mb-3 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                    Aviso de otro padre
                  </div>
                )}
                {isProfessor ? (
                  // Professor view: show family info
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">
                          {notice.activityDay.activity.name}
                        </h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>
                            Fecha:{' '}
                            {new Date(
                              notice.activityDay.date
                            ).toLocaleDateString('es-AR')}
                          </p>
                          <p>Hora: {notice.activityDay.schedule}</p>
                          <p>Familia: {notice.child.user.name}</p>
                          <p>Hijo: {notice.child.name}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Retira:</h4>
                        <p className="text-sm">
                          {notice.alternatePersonUser?.name ||
                            notice.alternatePersonName}
                        </p>
                        {notice.description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Nota: {notice.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Parent view
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">
                        {notice.activityDay.activity.name}
                      </h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          Fecha:{' '}
                          {new Date(notice.activityDay.date).toLocaleDateString(
                            'es-AR'
                          )}
                        </p>
                        <p>Hora: {notice.activityDay.schedule}</p>
                        <p>Hijo: {notice.child.name}</p>
                        {!isOwnNotice && (
                          <p className="mt-2 text-blue-700 font-medium">
                            Creado por: {notice.createdBy.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Retira:</h4>
                      <p className="text-sm">
                        {notice.alternatePersonUser?.name ||
                          notice.alternatePersonName}
                      </p>
                      {notice.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Nota: {notice.description}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {isMember && isOwnNotice && (
                  <div className="mt-4 flex gap-2">
                    <Link href={`/profile/pickup-notices/${notice.id}/edit`}>
                      <Button variant="outline">Editar</Button>
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
