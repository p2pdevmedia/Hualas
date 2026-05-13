import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { ClipboardList, MapPin, Navigation, Users, Wallet } from 'lucide-react';
import { listActivitiesWithParticipantCount } from '@/lib/activities/activity-records';
import { formatAmount } from '@/lib/accounting';
import { authOptions } from '@/lib/auth';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
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

const professorWorkspaceLinks = [
  {
    href: '/my-activities',
    label: 'Actividades',
    description:
      'Consultá tus actividades asignadas, días programados y asistencias.',
    icon: ClipboardList,
  },
  {
    href: '/professor/students',
    label: 'Mis grupos',
    description:
      'Accedé a tus grupos, alumnos, fichas y seguimiento de cada participante.',
    icon: Users,
  },
  {
    href: '/my-payments',
    label: 'Ingresos',
    description:
      'Revisá tus datos de pago, facturas cargadas e historial registrado.',
    icon: Wallet,
  },
];

async function hasAssignedMemberActivities(userId: string) {
  try {
    const accessibleChildOwnerIds = await getAccessibleChildOwnerIds(userId);
    const activityCount = await prisma.activityParticipant.count({
      where: {
        status: 'ACTIVE',
        OR: [
          { userId },
          { child: { userId: { in: accessibleChildOwnerIds } } },
        ],
      },
    });

    return activityCount > 0;
  } catch {
    return false;
  }
}

const mapEmbedUrl =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d47685.15!2d-71.3586!3d-40.1569!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9610be21a87b3b29%3A0x3f3d5fc3f3da0c0!2sSan%20Mart%C3%ADn%20de%20los%20Andes%2C%20Neuqu%C3%A9n!5e0!3m2!1ses!2sar!4v1';

const documentaryYoutubeId = 'r2-qBpH6FHg';
const documentaryYoutubeUrl = `https://www.youtube.com/watch?v=${documentaryYoutubeId}`;
const documentaryYoutubeEmbedUrl = `https://www.youtube-nocookie.com/embed/${documentaryYoutubeId}`;
const documentaryPdfFileId = '1xEVM3yeRTx1fCKqcqwGGn_pEFXWIBHIp';
const documentaryPdfUrl = `https://drive.google.com/file/d/${documentaryPdfFileId}/view?usp=sharing`;
const documentaryThumbnailUrl = `https://img.youtube.com/vi/${documentaryYoutubeId}/hqdefault.jpg`;

function documentaryPhotoStyle(size: number, gradient: string) {
  return {
    backgroundImage: `${gradient}, url('${documentaryThumbnailUrl}?w=${size}')`,
  };
}

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
  const activeRole = session?.user.activeRole ?? session?.user.role;
  const isMemberSession = activeRole === 'MEMBER';
  const isProfessorSession = activeRole === 'PROFESSOR';
  const showMemberSpace =
    isMemberSession && session?.user.id
      ? await hasAssignedMemberActivities(session.user.id)
      : false;

  return (
    <>
      {/* Divisor */}
      <div className="border-t border-border" />

      {isProfessorSession ? (
        <section className="px-4 py-12">
          <div className="mx-auto max-w-5xl space-y-8">
            <div className="max-w-3xl space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Profesor Hualas
              </p>
              <h1 className="font-heading text-4xl font-semibold leading-tight sm:text-5xl">
                Tu espacio de trabajo
              </h1>
              <p className="text-lg leading-8 text-muted-foreground">
                Un acceso rápido para organizar tu día en el club: revisá tus
                actividades, acompañá a tus grupos y consultá tus ingresos desde
                un solo lugar.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {professorWorkspaceLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-lg border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                  >
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h2 className="mt-4 text-xl font-semibold">{item.label}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
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
                Somos un club de San Martín de los Andes que acompaña a
                familias, chicos y adultos en actividades de montaña, naturaleza
                y vida comunitaria. Organizamos propuestas deportivas y
                recreativas con profesores, salidas planificadas y un fuerte
                espíritu local.
              </p>
            </div>

            {showMemberSpace || !isLoggedIn ? (
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  {showMemberSpace ? 'Tu espacio' : 'Sumate'}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {showMemberSpace
                    ? 'Seguís tus actividades desde acá.'
                    : 'Entrá al club y empezá a participar.'}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {showMemberSpace
                    ? 'Revisá tus inscripciones, próximos encuentros y novedades vinculadas a tus grupos.'
                    : 'Creá tu cuenta para anotarte en actividades, recibir novedades y gestionar tu perfil familiar.'}
                </p>
                <Link
                  href={showMemberSpace ? '/my-activities' : '/register'}
                  className="mt-5 inline-flex rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  {showMemberSpace ? 'Ir a mis actividades' : 'Ingresá al club'}
                </Link>
              </div>
            ) : null}
          </div>
        </section>
      )}

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

      {/* Documental */}
      <section className="border-t bg-gradient-to-br from-primary/10 via-background to-muted/40 px-4 py-14">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Proyecto audiovisual
              </p>
              <h2 className="mt-2 font-heading text-3xl font-semibold sm:text-4xl">
                Pequeños habitantes de la tierra
              </h2>
            </div>
            <p className="text-base leading-7 text-muted-foreground">
              Un documental del Club Hualas que invita a mirar la naturaleza con
              ojos curiosos: las infancias, el territorio y la vida pequeña que
              sostiene los paisajes de nuestra Patagonia.
            </p>
            <p className="text-base leading-7 text-muted-foreground">
              La propuesta acompaña el trabajo educativo del club y comparte una
              experiencia sensible para descubrir, cuidar y valorar el ambiente
              que habitamos.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={documentaryPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Ver más
              </a>
              <a
                href={documentaryYoutubeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-md border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
              >
                Abrir video
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border bg-black shadow-sm">
              <iframe
                title="Trailer de Pequeños habitantes de la tierra"
                src={documentaryYoutubeEmbedUrl}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            </div>
            <div
              className="grid grid-cols-3 gap-3"
              aria-label="Fotos del documental"
            >
              <div
                className="h-24 rounded-lg border bg-cover bg-center shadow-sm sm:h-28"
                style={documentaryPhotoStyle(
                  600,
                  'linear-gradient(135deg, rgba(34,197,94,0.35), rgba(14,116,144,0.2))'
                )}
              />
              <div
                className="h-24 rounded-lg border bg-cover bg-center shadow-sm sm:h-28"
                style={documentaryPhotoStyle(
                  800,
                  'linear-gradient(135deg, rgba(245,158,11,0.28), rgba(22,101,52,0.2))'
                )}
              />
              <div
                className="h-24 rounded-lg border bg-cover bg-center shadow-sm sm:h-28"
                style={documentaryPhotoStyle(
                  1000,
                  'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(132,204,22,0.22))'
                )}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Dónde estamos */}
      <section className="border-t bg-muted/25 px-4 py-14">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-stretch">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Dónde estamos
            </p>
            <h2 className="mt-2 font-heading text-3xl font-semibold">
              En San Martín de los Andes
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Hualas nace y se mueve entre la ciudad, los cerros y los espacios
              de encuentro de la comunidad. Nuestra actividad tiene base en San
              Martín de los Andes, Neuquén, en plena Patagonia argentina.
            </p>

            <div className="mt-6 space-y-3 text-sm">
              <p className="inline-flex items-center gap-2 font-medium text-foreground">
                <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                San Martín de los Andes, Neuquén, Argentina
              </p>
              <Link
                href="/contact"
                className="inline-flex w-fit items-center gap-2 rounded-md border bg-card px-4 py-2.5 font-semibold text-foreground transition hover:border-primary hover:text-primary"
              >
                Ver contacto
                <Navigation className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <iframe
              title="San Martín de los Andes"
              src={mapEmbedUrl}
              className="h-[340px] w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </>
  );
}
