import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import ActivitiesHeading from '@/components/activities-heading';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function ActivitiesPage() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    redirect('/');
  }

  let activities: any[] = [];

  try {
    activities = await prisma.activity.findMany({
      include: { participants: true },
      orderBy: { date: 'asc' },
    });
  } catch (e: any) {
    activities = [];
  }

  const frequencyLabels: Record<
    'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONE_TIME',
    string
  > = {
    DAILY: 'Diaria',
    WEEKLY: 'Semanal',
    MONTHLY: 'Mensual',
    ONE_TIME: 'Un solo pago',
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ActivitiesHeading />
        <Link href="/activities/new">
          <Button>Crear actividad</Button>
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <p>No hay actividades creadas.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {activities.map((activity) => (
            <li
              key={activity.id}
              className="rounded-xl border bg-card p-4 shadow-sm flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link
                  href={`/activities/${activity.id}`}
                  className="text-base font-semibold hover:text-primary transition-colors"
                >
                  {activity.name}
                </Link>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span>
                    {
                      frequencyLabels[
                        activity.frequency as keyof typeof frequencyLabels
                      ]
                    }
                  </span>
                  <span>·</span>
                  <span>${activity.price}</span>
                  <span>·</span>
                  <span>
                    {activity.capacity
                      ? `${Math.max(activity.capacity - activity.participants.length, 0)} cupos restantes`
                      : `${activity.participants.length} suscriptos`}
                  </span>
                </div>
              </div>
              <Link
                href={`/activities/${activity.id}/edit`}
                className="mt-2 text-sm text-primary hover:underline sm:mt-0 shrink-0"
              >
                Editar
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
