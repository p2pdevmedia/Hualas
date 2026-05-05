import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { gateAdmin } from '@/lib/role-guards';
import Link from 'next/link';
import ActivityDayForm from '@/app/activities/[id]/activity-day-form';

export default async function EditActivityDayPage({
  params,
}: {
  params: { id: string; dayId: string };
}) {
  const session = await getServerSession(authOptions);
  const block = gateAdmin(session);
  if (block) return block;

  const [day, activityProfessors, groups] = await Promise.all([
    prisma.activityDay.findUnique({
      where: { id: params.dayId },
      select: {
        id: true,
        activityId: true,
        date: true,
        schedule: true,
        geoLocation: true,
        latitude: true,
        longitude: true,
        description: true,
        activityGroupId: true,
        sportIcon: true,
        activity: { select: { name: true } },
        professors: { select: { userId: true } },
      },
    }),
    prisma.activityProfessor.findMany({
      where: { activityId: params.id },
      include: {
        user: {
          select: { id: true, name: true, lastName: true, email: true },
        },
      },
      orderBy: [{ user: { name: 'asc' } }],
    }),
    prisma.activityGroup.findMany({
      where: { activityId: params.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  const professors = activityProfessors.map((ap) => ap.user);

  if (!day || day.activityId !== params.id) redirect(`/activities/${params.id}`);

  const dateLabel = day.date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground font-body">
        <Link
          href="/activities"
          prefetch={true}
          className="hover:text-primary transition-colors"
        >
          Actividades
        </Link>
        <span>→</span>
        <Link
          href={`/activities/${params.id}`}
          prefetch={true}
          className="hover:text-primary transition-colors"
        >
          {day.activity.name}
        </Link>
        <span>→</span>
        <span className="text-foreground capitalize">{dateLabel}</span>
      </nav>

      <h1 className="font-heading text-2xl font-semibold capitalize">
        Editar sesión — {dateLabel}
      </h1>

      <ActivityDayForm
        activityId={params.id}
        mode="edit"
        dayId={params.dayId}
        professors={professors}
        groups={groups}
        defaultProfessorIds={activityProfessors.map((p) => p.userId)}
        initialValues={{
          date: day.date.toISOString().slice(0, 10),
          schedule: day.schedule,
          description: day.description ?? '',
          geoLocation: day.geoLocation,
          coordinates:
            day.latitude != null && day.longitude != null
              ? { latitude: day.latitude, longitude: day.longitude }
              : null,
          professorIds: day.professors.map((p) => p.userId),
          activityGroupId: day.activityGroupId,
          sportIcon: day.sportIcon,
        }}
        redirectOnSave={`/activities/${params.id}`}
      />
    </main>
  );
}
