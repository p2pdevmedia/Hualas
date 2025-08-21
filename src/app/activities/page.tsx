import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function ActivitiesPage() {
  const activities = await prisma.activity.findMany({
    include: { participants: true },
    orderBy: { date: 'asc' },
  });

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
