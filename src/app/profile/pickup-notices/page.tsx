import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';

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

  const notices = await prisma.pickupNotice.findMany({
    where: {
      ...(isProfessor ? {} : { createdById: (session.user as any).id }),
      deletedAt: null,
    },
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
            <h1 className="text-2xl font-bold tracking-tight">Avisos de retiro</h1>
            <p className="text-sm text-muted-foreground">
              {isProfessor
                ? 'Notificaciones de quién retirará a los hijos'
                : 'Notifica a los profesores que otra persona retirará a tu hijo'}
            </p>
          </div>
          {!isProfessor && (
            <Link href="/profile/pickup-notices/new">
              <Button>Crear aviso</Button>
            </Link>
          )}
        </div>
      </div>

      {notices.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-muted-foreground mb-4">
            {isProfessor ? 'No hay avisos de retiro' : 'No tenés avisos de retiro creados'}
          </p>
          {!isProfessor && (
            <Link href="/profile/pickup-notices/new">
              <Button>Crear tu primer aviso</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
            >
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
                          Fecha: {new Date(notice.activityDay.date).toLocaleDateString('es-AR')}
                        </p>
                        <p>Hora: {notice.activityDay.schedule}</p>
                        <p>Familia: {notice.child.user.name}</p>
                        <p>Hijo: {notice.child.name}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Retira:</h4>
                      <p className="text-sm">
                        {notice.alternatePersonUser?.name || notice.alternatePersonName}
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
                // Parent view: original layout
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      {notice.activityDay.activity.name}
                    </h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        Fecha: {new Date(notice.activityDay.date).toLocaleDateString('es-AR')}
                      </p>
                      <p>Hora: {notice.activityDay.schedule}</p>
                      <p>Hijo: {notice.child.name}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Retira:</h4>
                    <p className="text-sm">
                      {notice.alternatePersonUser?.name || notice.alternatePersonName}
                    </p>
                    {notice.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Nota: {notice.description}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {!isProfessor && (
                <div className="mt-4 flex gap-2">
                  <Link href={`/profile/pickup-notices/${notice.id}/edit`}>
                    <Button variant="outline">Editar</Button>
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
