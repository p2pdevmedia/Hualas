import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { paymentTypeLabels } from '@/lib/payment-type';

export default async function Home() {
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

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Welcome to Club Hualas</h1>
      <ul className="space-y-4">
        {activities.map((activity) => (
          <li
            key={activity.id}
            className="flex items-center justify-between border p-4"
          >
            <div>
              <span className="font-semibold">{activity.name}</span>
              <p className="text-sm text-slate-600">
                {paymentTypeLabels[activity.paymentType]}
              </p>
            </div>
            <Link href={`/activities/${activity.id}`}>
              <Button>Inscribirse</Button>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
