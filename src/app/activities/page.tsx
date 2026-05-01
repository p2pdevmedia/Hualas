import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import ActivitiesHeading from '@/components/activities-heading';
import DeleteActivityButton from './delete-activity-button';
import { listActivitiesWithParticipantCount } from '@/lib/activities/activity-records';
import { authOptions } from '@/lib/auth';

export default async function ActivitiesPage() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    redirect('/');
  }

  let activities: Awaited<
    ReturnType<typeof listActivitiesWithParticipantCount>
  > = [];

  try {
    activities = await listActivitiesWithParticipantCount();
  } catch (e: any) {
    activities = [];
  }

  const activityTypeLabels: Record<'TEMPORARY' | 'ANNUAL', string> = {
    TEMPORARY: 'Temporal',
    ANNUAL: 'Anual',
  };

  function formatDateRange(startDate: Date, endDate: Date) {
    const start = startDate.toLocaleDateString('es-AR');
    const end = endDate.toLocaleDateString('es-AR');
    return start === end ? start : `${start} al ${end}`;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ActivitiesHeading />
        <Link href="/activities/new">
          <Button>Crear actividad</Button>
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <p>No hay actividades creadas.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {activities.map((activity) => (
            <li
              key={activity.id}
              className="rounded-xl border bg-card p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link
                  href={`/activities/${activity.id}`}
                  className="text-base font-semibold hover:text-primary transition-colors"
                >
                  {activity.name}
                </Link>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span>
                    {
                      activityTypeLabels[
                        activity.activityType as keyof typeof activityTypeLabels
                      ]
                    }
                  </span>
                  <span>·</span>
                  <span>
                    {formatDateRange(activity.date, activity.endDate)}
                  </span>
                  <span>·</span>
                  <span>${activity.price}</span>
                  <span>·</span>
                  <span>
                    {activity.capacity
                      ? `${Math.max(activity.capacity - activity.participantCount, 0)} cupos restantes`
                      : `${activity.participantCount} suscriptos`}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Link
                  href={`/activities/${activity.id}`}
                  className="inline-flex items-center justify-center rounded-full border-[1.5px] border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                >
                  Ver
                </Link>
                <Link
                  href={`/activities/${activity.id}/edit`}
                  className="inline-flex items-center justify-center rounded-full border-[1.5px] border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  Editar
                </Link>
                <DeleteActivityButton
                  activityId={activity.id}
                  activityName={activity.name}
                  hasParticipants={activity.participantCount > 0}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
