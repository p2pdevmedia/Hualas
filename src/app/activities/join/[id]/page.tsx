import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActivityBaseRecordById } from '@/lib/activities/activity-records';
import { prisma } from '@/lib/prisma';
import JoinEnrollmentPanel from './join-enrollment-panel';

interface ActivityJoinPageProps {
  params: { id: string };
}

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

export default async function ActivityJoinPage({
  params,
}: ActivityJoinPageProps) {
  const activity = await getActivityBaseRecordById(params.id);

  if (!activity) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user ? ((session.user as any).id as string) : null;

  const [participantCount, groups, sessions, userProfile] = await Promise.all([
    prisma.activityParticipant.count({ where: { activityId: activity.id } }),
    prisma.activityGroup.findMany({
      where: { activityId: activity.id },
      select: {
        id: true,
        name: true,
        capacity: true,
        minAge: true,
        maxAge: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.activityDay.findMany({
      where: { activityId: activity.id, cancelled: false },
      select: {
        id: true,
        date: true,
        schedule: true,
        activityGroupId: true,
        professors: { select: { user: { select: { name: true, lastName: true } } } },
      },
      orderBy: { date: 'asc' },
    }),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: {
            name: true,
            lastName: true,
            dni: true,
            birthDate: true,
            address: true,
            phone: true,
          },
        })
      : Promise.resolve(null),
  ]);

  const professorsByGroup: Record<string, string[]> = {};
  for (const session of sessions) {
    if (!session.activityGroupId) continue;
    if (!professorsByGroup[session.activityGroupId]) professorsByGroup[session.activityGroupId] = [];
    for (const { user } of session.professors) {
      const fullName = [user.name, user.lastName].filter(Boolean).join(' ');
      if (!professorsByGroup[session.activityGroupId].includes(fullName)) {
        professorsByGroup[session.activityGroupId].push(fullName);
      }
    }
  }

  const capacity =
    groups.length === 0 || groups.some((g) => g.capacity == null)
      ? null
      : groups.reduce((sum, g) => sum + (g.capacity as number), 0);
  const hasCapacity = capacity != null;
  const remainingSpots = hasCapacity
    ? Math.max(capacity - participantCount, 0)
    : null;
  const isFull = hasCapacity && remainingSpots === 0;
  const activityDateRange = formatDateRange(activity.date, activity.endDate);

  return (
    <main className="pb-12">
      {activity.image ? (
        <div className="relative h-56 w-full overflow-hidden">
          <Image
            src={`/api/activities/${activity.id}/image`}
            alt={activity.name}
            fill
            unoptimized
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
        </div>
      ) : (
        <div
          className="h-56 w-full"
          style={{
            background: 'linear-gradient(135deg, #1C2117 0%, #49BDA6 100%)',
          }}
        />
      )}

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <section className="space-y-6">
          <nav className="flex items-center gap-2 text-xs text-muted-foreground font-body">
            <Link href="/" className="hover:text-primary transition-colors">
              Inicio
            </Link>
            <span>→</span>
            <span className="text-foreground">{activity.name}</span>
          </nav>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                {activityDateRange}
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-semibold leading-tight sm:text-4xl">
                {activity.name}
              </h1>
              {activity.description && (
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground font-body">
                  {activity.description}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="rounded-lg border bg-card p-4">
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground font-body">
                Precio
              </p>
              <p className="font-heading text-lg font-semibold">
                ${activity.price}
              </p>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: 'Inscriptos',
                    value: `${participantCount} personas`,
                  },
                  {
                    label: 'Cupo',
                    value: hasCapacity ? `${capacity} lugares` : 'Ilimitado',
                  },
                  {
                    label: 'Disponibles',
                    value: hasCapacity
                      ? isFull
                        ? 'Sin lugares'
                        : `${remainingSpots} lugares`
                      : 'No aplica',
                  },
                ].map((item) => (
                  <div key={item.label} className="min-w-0">
                    <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground font-body">
                      {item.label}
                    </p>
                    <p className="break-words font-heading text-lg font-semibold">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <JoinEnrollmentPanel
          activity={{
            id: activity.id,
            name: activity.name,
            price: Number(activity.price),
            activityType: activity.activityType,
          }}
          groups={groups.map((g) => ({ ...g, professors: professorsByGroup[g.id] ?? [] }))}
          sessions={sessions.map((session) => ({
            id: session.id,
            date: session.date.toISOString(),
            schedule: session.schedule,
            activityGroupId: session.activityGroupId,
          }))}
          isFull={isFull}
          hasCapacity={hasCapacity}
          remainingSpots={remainingSpots}
          userBirthDate={userProfile?.birthDate?.toISOString() ?? null}
          userPhone={userProfile?.phone ?? null}
          selfMissingFields={
            userProfile
              ? [
                  !userProfile.name?.trim() ? 'nombre' : null,
                  !userProfile.lastName?.trim() ? 'apellido' : null,
                  !userProfile.dni?.trim() ? 'DNI' : null,
                  !userProfile.birthDate ? 'fecha de nacimiento' : null,
                  !userProfile.address?.trim() ? 'dirección' : null,
                  !userProfile.phone?.trim() ? 'teléfono' : null,
                ].filter((f): f is string => f !== null)
              : []
          }
          activityStartDate={activity.date.toISOString()}
        />
      </div>
    </main>
  );
}
