import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { listActivitiesWithParticipantCount } from '@/lib/activities/activity-records';
import { formatAmount } from '@/lib/accounting';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import HomeActivitiesSlider, {
  type HomeActivitySlide,
} from './home-activities-slider';

type HomeNewsItem = {
  id: string;
  title: string;
  body: string;
  createdAtLabel: string;
};

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

function formatNewsDate(date: Date) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function summarizeText(text: string, maxLength = 155) {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  return cleanText.length > maxLength
    ? `${cleanText.slice(0, maxLength).trim()}...`
    : cleanText;
}

const activityTypeLabels: Record<'TEMPORARY' | 'ANNUAL', string> = {
  TEMPORARY: 'Temporal',
  ANNUAL: 'Anual',
};

export default async function Home() {
  let activities: Awaited<
    ReturnType<typeof listActivitiesWithParticipantCount>
  > = [];
  let news: HomeNewsItem[] = [];
  const session = await getServerSession(authOptions);

  try {
    activities = await listActivitiesWithParticipantCount();
  } catch {
    activities = [];
  }

  try {
    const latestNews = await prisma.news.findMany({
      where: { scope: 'CLUB' },
      select: {
        id: true,
        title: true,
        body: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    news = latestNews.map((item) => ({
      id: item.id,
      title: item.title,
      body: summarizeText(item.body),
      createdAtLabel: formatNewsDate(item.createdAt),
    }));
  } catch {
    news = [];
  }

  const now = new Date();
  const upcomingActivities = activities.filter(
    (activity) => activity.endDate >= now
  );
  const activitySlides: HomeActivitySlide[] = upcomingActivities.map(
    (activity) => ({
      id: activity.id,
      name: activity.name,
      description:
        summarizeText(activity.description ?? '', 210) ||
        'Una propuesta del Club Hualas para compartir montaña, aprendizaje y vida al aire libre.',
      dateLabel:
        activity.date && activity.endDate
          ? formatDateRange(activity.date, activity.endDate)
          : null,
      capacityLabel: activity.capacity
        ? `${Math.max(
            Number(activity.capacity) - Number(activity.participantCount),
            0
          )} cupos disponibles`
        : `${activity.participantCount} inscriptos`,
      priceLabel: formatAmount(activity.price),
      typeLabel:
        activityTypeLabels[
          activity.activityType as keyof typeof activityTypeLabels
        ],
      imageUrl: activity.image ? `/api/activities/${activity.id}/image` : null,
    })
  );
  const isLoggedIn = Boolean(session?.user);

  return (
    <>
      {/* Divisor */}
      <div className="border-t border-border" />

      {/* Quiénes somos */}
      <section className="px-4 py-12">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Club Hualas
            </p>
            <h1 className="font-heading text-4xl font-semibold leading-tight sm:text-5xl">
              Quiénes somos
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
              Somos un club de San Martín de los Andes que acompaña a familias,
              chicos y adultos en actividades de montaña, naturaleza y vida
              comunitaria. Organizamos propuestas deportivas y recreativas con
              profesores, salidas planificadas y un fuerte espíritu local.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              {isLoggedIn ? 'Tu espacio' : 'Sumate'}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              {isLoggedIn
                ? 'Seguís tus actividades desde acá.'
                : 'Entrá al club y empezá a participar.'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {isLoggedIn
                ? 'Revisá tus inscripciones, próximos encuentros y novedades vinculadas a tus grupos.'
                : 'Creá tu cuenta para anotarte en actividades, recibir novedades y gestionar tu perfil familiar.'}
            </p>
            <Link
              href={isLoggedIn ? '/my-activities' : '/register'}
              className="mt-5 inline-flex rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              {isLoggedIn ? 'Ir a mis actividades' : 'Ingresá al club'}
            </Link>
          </div>
        </div>
      </section>

      {/* Próximas actividades y noticias */}
      <section className="px-4 pb-14">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Agenda del club
              </p>
              <h2 className="font-heading text-3xl font-semibold">
                Próximas actividades
              </h2>
            </div>
            <Link
              href="/news"
              className="text-sm font-semibold text-primary transition hover:text-primary/80"
            >
              Ver todas las noticias
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-[3fr_1fr]">
            <HomeActivitiesSlider activities={activitySlides} />

            <aside
              className="rounded-lg border bg-card p-5 shadow-sm"
              aria-label="Noticias del club"
            >
              <div className="mb-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  Noticias
                </p>
                <h3 className="text-xl font-semibold">Del club</h3>
              </div>

              {news.length === 0 ? (
                <div className="rounded-md bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">
                  Todavía no hay noticias publicadas para mostrar.
                </div>
              ) : (
                <div className="space-y-4">
                  {news.map((item) => (
                    <article
                      key={item.id}
                      className="border-b pb-4 last:border-0 last:pb-0"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {item.createdAtLabel}
                      </p>
                      <h4 className="mt-1 text-base font-semibold leading-snug">
                        {item.title}
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {item.body}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
