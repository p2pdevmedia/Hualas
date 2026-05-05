import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { gateActiveRole } from '@/lib/role-guards';
import Link from 'next/link';
import DescriptionForm from './description-form';

export default async function DayDescripcionPage({
  params,
}: {
  params: { id: string; dayId: string };
}) {
  const session = await getServerSession(authOptions);
  const block = gateActiveRole(session, ['ADMIN', 'PROFESSOR']);
  if (block) return block;

  const isAdmin = session!.user.role === 'ADMIN';
  const isProfessor = session!.user.role === 'PROFESSOR';

  const day = await prisma.activityDay.findUnique({
    where: { id: params.dayId },
    include: {
      activity: { select: { id: true, name: true } },
      activityGroup: { select: { id: true, name: true } },
      professors: { select: { userId: true } },
    },
  });

  if (!day || day.activityId !== params.id) redirect('/my-activities');

  if (
    isProfessor &&
    !day.professors.some((p) => p.userId === session!.user.id)
  ) {
    redirect('/my-activities');
  }

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
          href="/my-activities"
          prefetch={true}
          className="hover:text-primary transition-colors"
        >
          Mis actividades
        </Link>
        <span>→</span>
        <Link
          href={`/activities/${day.activity.id}/days/${day.id}`}
          prefetch={true}
          className="hover:text-primary transition-colors capitalize"
        >
          {dateLabel}
        </Link>
        <span>→</span>
        <span className="text-foreground">Descripción</span>
      </nav>

      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold">Descripción</h1>
        <p className="text-sm text-muted-foreground capitalize">{dateLabel}</p>
        <p className="text-sm text-muted-foreground">
          {day.schedule} · {day.geoLocation}
        </p>
        {day.activityGroup && (
          <p className="text-xs text-muted-foreground">
            Grupo: {day.activityGroup.name}
          </p>
        )}
      </div>

      <DescriptionForm
        dayId={day.id}
        initialDescription={day.description ?? null}
      />
    </main>
  );
}
