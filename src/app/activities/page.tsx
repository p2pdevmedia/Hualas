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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <ActivitiesHeading />
        {(session?.user.role === 'ADMIN' ||
          session?.user.role === 'SUPER_ADMIN') && (
          <Link href="/activities/new">
            <Button variant="secondary">Crear actividad</Button>
          </Link>
        )}
      </div>
      <ul className="grid gap-6 md:grid-cols-2">
        {activities.map((activity) => (
          <li
            key={activity.id}
            className="flex flex-col justify-between gap-4 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur"
          >
            <div className="space-y-3">
              <Link
                href={`/activities/${activity.id}`}
                className="text-lg font-semibold text-slate-900 transition hover:text-emerald-600"
              >
                {activity.name}
              </Link>
              <p className="text-sm text-slate-500">
                {frequencyLabels[activity.frequency as keyof typeof frequencyLabels]}
              </p>
              <p className="text-sm font-semibold text-slate-700">
                {activity.participants.length} suscriptos
              </p>
              <p className="text-sm text-slate-500">Precio: ${activity.price}</p>
            </div>
            {(session?.user.role === 'ADMIN' ||
              session?.user.role === 'SUPER_ADMIN') && (
              <div className="flex items-center justify-between">
                <Link
                  href={`/activities/${activity.id}/edit`}
                  className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
                >
                  Editar
                </Link>
                <Link
                  href={`/activities/${activity.id}`}
                  className="text-sm text-slate-500 transition hover:text-slate-700"
                >
                  Ver detalles →
                </Link>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
