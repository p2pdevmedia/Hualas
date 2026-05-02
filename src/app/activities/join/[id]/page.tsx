import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getActivityBaseRecordById } from '@/lib/activities/activity-records';
import { prisma } from '@/lib/prisma';
import RegisterButton from '@/app/activities/[id]/register-button';

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

  const participantCount = await prisma.activityParticipant.count({
    where: { activityId: activity.id },
  });

  const activityTypeLabels: Record<'TEMPORARY' | 'ANNUAL', string> = {
    TEMPORARY: 'Temporal',
    ANNUAL: 'Anual',
  };
  const capacity = activity.capacity;
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

      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[1fr_320px]">
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
                {activityTypeLabels[activity.activityType]}
              </span>
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

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Precio', value: `$${activity.price}` },
              {
                label: 'Inscriptos',
                value: `${participantCount} personas`,
              },
              {
                label: 'Cupo',
                value: hasCapacity
                  ? `${activity.capacity} lugares`
                  : 'Ilimitado',
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
              <div key={item.label} className="rounded-lg border bg-card p-4">
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground font-body">
                  {item.label}
                </p>
                <p className="font-heading text-lg font-semibold">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border bg-card p-5">
            <h2 className="font-heading text-lg font-semibold">Qué sigue</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground font-body">
              Completá la inscripción desde el panel lateral. Si ya estás
              logueado, se agregará al carrito de actividades; si no, primero te
              pedirá iniciar sesión.
            </p>
            <Link
              href={`/activities/${activity.id}`}
              className="mt-4 inline-block text-sm text-link underline underline-offset-4 hover:text-link/80 font-body"
            >
              Ver la vista de detalle de mis actividades
            </Link>
          </div>
        </section>

        <aside className="lg:sticky lg:top-6">
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-body">
                Inscripción
              </p>
              <p className="font-heading text-2xl font-semibold">
                ${activity.price}
              </p>
              {hasCapacity && (
                <p
                  className={`text-xs font-body ${
                    isFull ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {isFull
                    ? 'Cupo completo'
                    : `${remainingSpots} lugares disponibles`}
                </p>
              )}
            </div>

            {isFull ? (
              <div className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground font-body">
                No hay cupos disponibles en este momento.
              </div>
            ) : (
              <RegisterButton
                activityId={activity.id}
                activityName={activity.name}
                activityPrice={Number(activity.price)}
              />
            )}

            <p className="text-xs leading-relaxed text-muted-foreground font-body">
              Este acceso está pensado para la inscripción desde la portada. La
              vista completa de tu actividad sigue disponible en{' '}
              <Link
                href={`/activities/${activity.id}`}
                className="underline underline-offset-4 hover:text-foreground"
              >
                /activities/{activity.id}
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
