import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import ActivitiesHeading from '@/components/activities-heading';
import { listActivitiesWithParticipantCount } from '@/lib/activities/activity-records';
import { authOptions } from '@/lib/auth';
import ActivitiesTabs from './activities-tabs';

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

  const now = new Date();
  const upcomingActivities = activities
    .filter((activity) => activity.endDate >= now)
    .map((activity) => ({
      ...activity,
      date: activity.date.toISOString(),
      endDate: activity.endDate.toISOString(),
    }));

  const pastActivities = activities
    .filter((activity) => activity.endDate < now)
    .map((activity) => ({
      ...activity,
      date: activity.date.toISOString(),
      endDate: activity.endDate.toISOString(),
    }));

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
        <ActivitiesTabs
          upcomingActivities={upcomingActivities}
          pastActivities={pastActivities}
        />
      )}
    </main>
  );
}
