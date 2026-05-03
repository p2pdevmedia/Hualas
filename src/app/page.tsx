import Link from 'next/link';
import { listActivitiesWithParticipantCount } from '@/lib/activities/activity-records';

export default async function Home() {
  let activities: Awaited<
    ReturnType<typeof listActivitiesWithParticipantCount>
  > = [];

  function formatDateRange(startDate: Date, endDate: Date) {
    const start = startDate.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
    });
    const end = endDate.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
    });

    return start === end ? start : `${start} al ${end}`;
  }

  const activityTypeLabels: Record<'TEMPORARY' | 'ANNUAL', string> = {
    TEMPORARY: 'Temporal',
    ANNUAL: 'Anual',
  };

  try {
    activities = await listActivitiesWithParticipantCount();
  } catch {
    activities = [];
  }

  const now = new Date();
  const upcomingActivities = activities.filter(
    (activity) => activity.endDate >= now
  );

  return (
    <>
      {/* Divisor */}
      <div className="border-t border-border" />

      {/* Próximas actividades */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h2 className="font-heading text-3xl font-semibold">
              Próximas actividades
            </h2>
          </div>

          {upcomingActivities.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground font-body">
              <p>No hay actividades disponibles por el momento.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingActivities.map((activity) => (
                <Link
                  key={activity.id}
                  href={`/activities/join/${activity.id}`}
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
                      <div className="p-3">
                        <span
                          className="text-xs rounded-full px-2 py-0.5 font-body"
                          style={{
                            background: 'rgba(123,163,168,0.2)',
                            border: '1px solid rgba(123,163,168,0.4)',
                            color: '#5a8c91',
                          }}
                        >
                          {
                            activityTypeLabels[
                              activity.activityType as keyof typeof activityTypeLabels
                            ]
                          }
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      {activity.date && activity.endDate && (
                        <p className="text-xs text-muted-foreground mb-1 font-body uppercase tracking-wide">
                          {formatDateRange(activity.date, activity.endDate)}
                        </p>
                      )}
                      <div className="font-heading text-lg font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                        {activity.name}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground font-body">
                        {activity.capacity
                          ? `${Math.max(activity.capacity - activity.participantCount, 0)} cupos disponibles`
                          : `${activity.participantCount} inscriptos`}
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
