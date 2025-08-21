import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export default async function ActivitiesPage() {
  type ActivityWithParticipants = Prisma.ActivityGetPayload<{
    include: { participants: true };
  }>;

  let activities: ActivityWithParticipants[] = [];

  try {
    activities = await prisma.activity.findMany({
      include: { participants: true },
      orderBy: { date: 'asc' },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2021'
    ) {
      activities = [];
    } else {
      throw e;
    }
  }

  const paymentTypeLabels = {
    ONE_TIME: 'Pago único',
    MONTHLY: 'Mensual',
    WEEKLY: 'Semanal',
    DAILY: 'Diario',
  } as const;

  return (
    <main className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activities</h1>
        <Link href="/activities/new">
          <Button>Crear actividad</Button>
        </Link>
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
              {activity.participants.length} participants ·{' '}
              {paymentTypeLabels[activity.paymentType]}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
