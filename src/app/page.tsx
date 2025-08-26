import HomeHeading from '@/components/home-heading';
import Link from 'next/link';
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
      <HomeHeading />
      <ul className="space-y-4">
        {activities.map((activity) => (
          <li key={activity.id}>
            <Link
              href={`/activities/${activity.id}`}
              className="block max-w-sm w-full lg:max-w-full lg:flex"
            >
              <div
                className="h-48 lg:h-auto lg:w-48 flex-none bg-cover rounded-t lg:rounded-t-none lg:rounded-l text-center overflow-hidden bg-gray-200"
                style={
                  activity.image
                    ? { backgroundImage: `url(${activity.image})` }
                    : undefined
                }
                title={activity.name}
              />
              <div className="border-r border-b border-l border-gray-400 lg:border-l-0 lg:border-t lg:border-gray-400 bg-white rounded-b lg:rounded-b-none lg:rounded-r p-4 flex flex-col justify-between leading-normal">
                <div className="mb-8">
                  {activity.date && (
                    <p className="text-sm text-gray-600">
                      {activity.date.toLocaleDateString()}
                    </p>
                  )}
                  <div className="text-gray-900 font-bold text-xl mb-2">
                    {activity.name}
                  </div>
                  {activity.description && (
                    <p className="text-gray-700 text-base">
                      {activity.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center">
                  <div className="text-sm">
                    <p className="text-gray-600">
                      {activity.participants.length} participantes
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
