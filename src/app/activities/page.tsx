import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export default async function ActivitiesPage() {
  let activities = [] as Awaited<ReturnType<typeof prisma.activity.findMany>>;

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
      <h1 className="mb-4 text-2xl font-bold">Activities</h1>
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
              {activity.participants.length} participants
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
