import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { Button } from '@/components/ui/button';
import ActivitiesHeading from '@/components/activities-heading';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function ActivitiesPage() {
  let activities: any[] = [];

  const session = await getServerSession(authOptions);

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
    <main className="p-4">
      <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ActivitiesHeading />
        {session?.user.role === 'ADMIN' && (
          <Link href="/activities/new">
            <Button>Crear actividad</Button>
          </Link>
        )}
      </div>
      <ul className="space-y-4">
        {activities.map((activity) => (
          <li key={activity.id} className="border p-4">
            <Link
              href={`/activities/${activity.id}`}
              className="text-xl font-semibold"
            >
              {activity.name}
            </Link>
            <p className="text-sm text-slate-600">
              {activity.participants.length} suscriptos
            </p>
            <p className="text-sm text-slate-600">
              {
                frequencyLabels[
                  activity.frequency as keyof typeof frequencyLabels
                ]
              }
            </p>
            <p className="text-sm text-slate-600">Precio: ${activity.price}</p>
            {session?.user.role === 'ADMIN' && (
              <Link
                href={`/activities/${activity.id}/edit`}
                className="text-sm text-blue-600"
              >
                Editar
              </Link>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
