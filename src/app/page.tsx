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
    <main className="mx-auto max-w-6xl px-4 py-6">
      <HomeHeading />
      {activities.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <p>No hay actividades disponibles por el momento.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => (
            <Link
              key={activity.id}
              href={`/activities/${activity.id}`}
              className="group block"
            >
              <div className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
                <div
                  className="h-48 bg-cover bg-center bg-muted"
                  style={
                    activity.image
                      ? { backgroundImage: `url(${activity.image})` }
                      : undefined
                  }
                />
                <div className="p-4">
                  <div className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                    {activity.name}
                  </div>
                  {activity.date && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {activity.date.toLocaleDateString()}
                    </p>
                  )}
                  {activity.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {activity.description}
                    </p>
                  )}
                  <div className="mt-3 border-t pt-3 text-sm text-muted-foreground">
                    {activity.participants.length} participantes
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
