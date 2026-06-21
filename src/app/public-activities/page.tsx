import Link from 'next/link';
import { listActivitiesWithParticipantCount } from '@/lib/activities/activity-records';
import {
  buildPublicActivityCards,
  type PublicActivityCard,
} from '@/lib/activities/public-activity-cards';
import PublicActivitiesFeed from './public-activities-feed';

export default async function PublicActivitiesPage() {
  let activities: Awaited<
    ReturnType<typeof listActivitiesWithParticipantCount>
  > = [];

  try {
    activities = await listActivitiesWithParticipantCount();
  } catch {
    activities = [];
  }

  const cards: PublicActivityCard[] = buildPublicActivityCards(
    activities,
    () => '/activities/join',
    'Elegir actividad'
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <section className="space-y-4">
        <div className="flex flex-col gap-3 rounded-[2rem] border bg-gradient-to-br from-primary/10 via-background to-muted/30 p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <span>Club Hualas</span>
            <span className="text-muted-foreground">/</span>
            <span>Acceso público</span>
          </div>

          <div className="max-w-3xl space-y-3">
            <h1 className="font-heading text-4xl font-semibold leading-tight sm:text-5xl">
              Actividades del club
            </h1>
            <p className="text-base leading-7 text-muted-foreground sm:text-lg">
              Un catálogo público para explorar todas las actividades en un solo
              lugar, descubrir fechas, cupos y precios, y entrar al detalle para
              inscribirte cuando quieras.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-full border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
            >
              Volver al inicio
            </Link>
            <Link
              href="/register?returnTo=/public-activities"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-8">
        <PublicActivitiesFeed activities={cards} />
      </div>
    </main>
  );
}
