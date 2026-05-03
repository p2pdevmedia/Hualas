import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';

export default async function ActivityDayPage({
  params,
}: {
  params: { id: string; dayId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const isAdmin =
    session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
  const isProfessor = session.user.role === 'PROFESSOR';

  if (!isAdmin && !isProfessor) redirect('/');

  const day = await prisma.activityDay.findUnique({
    where: { id: params.dayId },
    include: {
      activity: { select: { id: true, name: true } },
      activityGroup: { select: { id: true, name: true } },
      professors: { select: { userId: true } },
      attendances: { select: { status: true } },
    },
  });

  if (!day || day.activityId !== params.id) redirect('/my-activities');

  if (
    isProfessor &&
    !day.professors.some((p) => p.userId === session.user.id)
  ) {
    redirect('/my-activities');
  }

  const dateLabel = day.date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const going = day.attendances.filter((a) => a.status === 'GOING').length;
  const total = day.attendances.length;

  const base = `/activities/${params.id}/days/${params.dayId}`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground font-body">
        <Link href="/my-activities" className="hover:text-primary transition-colors">
          Mis actividades
        </Link>
        <span>→</span>
        <Link
          href={`/activities/${day.activity.id}`}
          className="hover:text-primary transition-colors"
        >
          {day.activity.name}
        </Link>
        <span>→</span>
        <span className="text-foreground capitalize">{dateLabel}</span>
      </nav>

      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold capitalize">
          {dateLabel}
        </h1>
        <p className="text-sm text-muted-foreground">
          {day.schedule} · {day.geoLocation}
        </p>
        {day.activityGroup && (
          <p className="text-xs text-muted-foreground">
            Grupo: {day.activityGroup.name}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href={`${base}/descripcion`}
          className="flex flex-col gap-3 rounded-xl border bg-card p-5 hover:border-primary transition-colors"
        >
          <Image
            src="/1_Informacion.png"
            alt="Información"
            width={52}
            height={52}
            className="h-10 w-10 object-contain"
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Descripción
          </span>
          <span className="text-sm text-foreground line-clamp-3">
            {day.description ?? (
              <span className="italic text-muted-foreground">Sin descripción</span>
            )}
          </span>
        </Link>

        <Link
          href={`${base}/observaciones`}
          className="flex flex-col gap-3 rounded-xl border bg-card p-5 hover:border-primary transition-colors"
        >
          <Image
            src="/1_Observacion.png"
            alt="Observación"
            width={52}
            height={52}
            className="h-10 w-10 object-contain"
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Observaciones
          </span>
          <span className="text-sm text-muted-foreground">
            {day.planificacion || day.devolucion
              ? 'Ver planificación y devolución'
              : 'Agregar planificación y devolución'}
          </span>
        </Link>

        <Link
          href={`${base}/attendance`}
          className="flex flex-col gap-3 rounded-xl border bg-card p-5 hover:border-primary transition-colors"
        >
          <Image
            src="/1_asistencia.png"
            alt="Asistencia"
            width={52}
            height={52}
            className="h-10 w-10 object-contain"
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Asistencia
          </span>
          <span className="text-sm text-muted-foreground">
            {total > 0 ? `${going} de ${total} asistieron` : 'Sin registros aún'}
          </span>
        </Link>
      </div>
    </main>
  );
}
