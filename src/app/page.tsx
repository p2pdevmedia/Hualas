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
    <div className="space-y-12">
      <HomeHeading />
      <section className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Próximas actividades
            </h2>
            <p className="text-sm text-slate-500">
              Sumate a las propuestas vigentes o descubrí qué se viene.
            </p>
          </div>
          <Link
            href="/activities"
            className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
          >
            Ver todas las actividades →
          </Link>
        </div>
        {activities.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300/70 bg-white/60 p-10 text-center text-slate-500 backdrop-blur">
            Aún no hay actividades publicadas. ¡Pronto habrá novedades!
          </div>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2">
            {activities.map((activity) => (
              <li key={activity.id}>
                <Link
                  href={`/activities/${activity.id}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-emerald-200/40"
                >
                  {activity.image ? (
                    <div
                      className="relative h-40 overflow-hidden rounded-2xl bg-slate-200"
                    >
                      <div
                        className="absolute inset-0 bg-cover bg-center transition duration-300 group-hover:scale-105"
                        style={{ backgroundImage: `url(${activity.image})` }}
                      />
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-900/70 to-transparent" />
                    </div>
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      Sin imagen disponible
                    </div>
                  )}
                  <div className="mt-5 flex flex-1 flex-col gap-3">
                    {activity.date && (
                      <span className="inline-flex w-fit items-center rounded-full bg-emerald-50/90 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {activity.date.toLocaleDateString()}
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-slate-900">
                      {activity.name}
                    </h3>
                    {activity.description && (
                      <p className="text-sm text-slate-500">
                        {activity.description}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700">
                        Participantes: {activity.participants.length}
                      </span>
                      <span className="text-emerald-600 transition group-hover:text-emerald-700">
                        Ver detalle
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
