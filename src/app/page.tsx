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
      take: 6,
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
    <>
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          height: '340px',
          background:
            'linear-gradient(135deg, #1C2117 0%, #49BDA6 60%, #2f8372 100%)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="relative z-10 h-full flex flex-col justify-end px-6 pb-10 max-w-5xl mx-auto">
          <span className="text-xs text-white/60 uppercase tracking-widest mb-3 font-body">
            📍 San Martín de los Andes · Neuquén, Patagonia
          </span>
          <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-white leading-tight mb-3">
            Explorá la Patagonia
            <br />
            con nosotros
          </h1>
          <p className="text-sm text-white/75 mb-7 max-w-md font-body">
            Club de montaña. Escalada, trekking e infancias en el corazón de los
            Andes neuquinos.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/activities"
              className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors font-body"
            >
              Ver actividades
            </Link>
            <Link
              href="/register"
              className="rounded-full border-[1.5px] border-white/70 px-5 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors font-body"
            >
              Conocer el club
            </Link>
          </div>
        </div>
      </section>

      {/* Quiénes somos */}
      <section className="bg-background py-12 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
          <div>
            <div className="text-4xl mb-3">⛰️</div>
            <h3 className="font-heading text-xl font-semibold mb-2">Montaña</h3>
            <p className="text-sm text-muted-foreground leading-relaxed font-body">
              Expediciones y travesías en los Andes patagónicos para todos los
              niveles.
            </p>
          </div>
          <div>
            <div className="text-4xl mb-3">🧗</div>
            <h3 className="font-heading text-xl font-semibold mb-2">
              Escalada
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed font-body">
              Cursos y salidas de escalada en roca con instructores
              certificados.
            </p>
          </div>
          <div>
            <div className="text-4xl mb-3">🌿</div>
            <h3 className="font-heading text-xl font-semibold mb-2">
              Infancias
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed font-body">
              Actividades especiales para niñas, niños y adolescentes en la
              naturaleza.
            </p>
          </div>
        </div>
      </section>

      {/* Divisor */}
      <div className="border-t border-border" />

      {/* Próximas actividades */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <h2 className="font-heading text-3xl font-semibold">
              Próximas actividades
            </h2>
            <Link
              href="/activities"
              className="text-sm text-link hover:text-link/80 underline underline-offset-4 font-body"
            >
              Ver todas
            </Link>
          </div>

          {activities.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground font-body">
              <p>No hay actividades disponibles por el momento.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {activities.map((activity) => (
                <Link
                  key={activity.id}
                  href={`/activities/${activity.id}`}
                  className="group block"
                >
                  <div className="overflow-hidden rounded-lg border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                    <div
                      className="h-36 bg-muted bg-cover bg-center"
                      style={
                        activity.image
                          ? {
                              backgroundImage: `url(/api/activities/${activity.id}/image)`,
                            }
                          : {
                              background:
                                'linear-gradient(135deg, #2f8372, #49BDA6)',
                            }
                      }
                    >
                      {activity.frequency &&
                        activity.frequency !== 'ONE_TIME' && (
                          <div className="p-3">
                            <span
                              className="text-xs rounded-full px-2 py-0.5 font-body"
                              style={{
                                background: 'rgba(123,163,168,0.2)',
                                border: '1px solid rgba(123,163,168,0.4)',
                                color: '#5a8c91',
                              }}
                            >
                              {activity.frequency === 'WEEKLY'
                                ? 'Semanal'
                                : activity.frequency === 'MONTHLY'
                                  ? 'Mensual'
                                  : 'Diaria'}
                            </span>
                          </div>
                        )}
                    </div>
                    <div className="p-4">
                      {activity.date && (
                        <p className="text-xs text-muted-foreground mb-1 font-body uppercase tracking-wide">
                          {activity.date.toLocaleDateString('es-AR', {
                            day: 'numeric',
                            month: 'long',
                          })}
                        </p>
                      )}
                      <div className="font-heading text-lg font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                        {activity.name}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground font-body">
                        {activity.capacity
                          ? `${Math.max(activity.capacity - activity.participants.length, 0)} cupos disponibles`
                          : `${activity.participants.length} inscriptos`}
                        {' · $'}
                        {activity.price}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
