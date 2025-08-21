import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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
          <li key={activity.id} className="flex flex-col border p-4">
            {activity.image && (
              <Image
                src={activity.image}
                alt={activity.name}
                width={800}
                height={600}
                className="mb-2 max-w-full"
              />
            )}
            <span className="mb-1 font-semibold">{activity.name}</span>
            {activity.description && (
              <p className="mb-2 text-sm text-slate-600">
                {activity.description}
              </p>
            )}
            <Link href={`/activities/${activity.id}`}>
              <Button>Inscribirse</Button>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
