import Link from 'next/link';
import { getServerSession } from 'next-auth';
import {
  ArrowRight,
  ClipboardList,
  CreditCard,
  Home as HomeIcon,
  MapPin,
  Navigation,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
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

async function getAssignedMemberActivityCount(userId: string) {
  const accessibleChildOwnerIds = await getAccessibleChildOwnerIds(userId);
  return prisma.activityParticipant.count({
    where: {
      status: 'ACTIVE',
      OR: [{ userId }, { child: { userId: { in: accessibleChildOwnerIds } } }],
    },
  });
}

async function getMemberHomeSummary(userId: string) {
  try {
    const [activityCount, childOwnerIds, familyGroups, user] =
      await Promise.all([
        getAssignedMemberActivityCount(userId),
        getAccessibleChildOwnerIds(userId),
        prisma.familyGroup.findMany({
          where: {
            OR: [
              { responsibleUserId: userId },
              { members: { some: { memberId: userId } } },
            ],
          },
          select: {
            responsibleUser: {
              select: {
                id: true,
                name: true,
                lastName: true,
                socialFeeActive: true,
              },
            },
            members: {
              select: {
                member: {
                  select: {
                    id: true,
                    name: true,
                    lastName: true,
                    socialFeeActive: true,
                  },
                },
              },
            },
          },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            lastName: true,
            socialFeeActive: true,
          },
        }),
      ]);

    const childrenCount = await prisma.child.count({
      where: { userId: { in: childOwnerIds } },
    });
    const adultById = new Map<
      string,
      { name: string | null; lastName: string | null; socialFeeActive: boolean }
    >();

    if (user) {
      adultById.set(user.id, user);
    }

    for (const group of familyGroups) {
      if (group.responsibleUser) {
        adultById.set(group.responsibleUser.id, group.responsibleUser);
      }
      for (const { member } of group.members) {
        adultById.set(member.id, member);
      }
    }

    const adults = [...adultById.values()];
    const unpaidAdultCount = adults.filter(
      (adult) => !adult.socialFeeActive
    ).length;

    return {
      activityCount,
      childrenCount,
      adultCount: adults.length,
      unpaidAdultCount,
    };
  } catch {
    return {
      activityCount: 0,
      childrenCount: 0,
      adultCount: 0,
      unpaidAdultCount: 0,
    };
  }
}

const mapEmbedUrl =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d47685.15!2d-71.3586!3d-40.1569!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9610be21a87b3b29%3A0x3f3d5fc3f3da0c0!2sSan%20Mart%C3%ADn%20de%20los%20Andes%2C%20Neuqu%C3%A9n!5e0!3m2!1ses!2sar!4v1';

const documentaryYoutubeId = 'r2-qBpH6FHg';
const documentaryYoutubeUrl = `https://www.youtube.com/watch?v=${documentaryYoutubeId}`;
const documentaryYoutubeEmbedUrl = `https://www.youtube-nocookie.com/embed/${documentaryYoutubeId}`;
const documentaryPdfFileId = '1xEVM3yeRTx1fCKqcqwGGn_pEFXWIBHIp';
const documentaryPdfUrl = `https://drive.google.com/file/d/${documentaryPdfFileId}/view?usp=sharing`;
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
  const memberHomeSummary =
    isMemberSession && session?.user.id
      ? await getMemberHomeSummary(session.user.id)
      : null;
  const showMemberSpace = (memberHomeSummary?.activityCount ?? 0) > 0;
  const hasPendingSocialFee =
    (memberHomeSummary?.unpaidAdultCount ?? 0) > 0;

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
      ) : isMemberSession ? (
        <section className="px-4 py-12">
          <div className="mx-auto max-w-5xl space-y-8">
            <div className="max-w-3xl space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Club Hualas
              </p>
              <h1 className="font-heading text-4xl font-semibold leading-tight sm:text-5xl">
                Tu espacio familiar
              </h1>
              <p className="text-lg leading-8 text-muted-foreground">
                Accedé rápido a tus actividades, la cuota social y los datos de
                tu familia.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Link
                href="/my-activities"
                className="group rounded-lg border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <ClipboardList className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-xl font-semibold">Mis actividades</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {memberHomeSummary?.activityCount
                    ? `${memberHomeSummary.activityCount} inscripción activa en tu grupo familiar.`
                    : 'Consultá tus actividades y sumá nuevas propuestas desde la agenda.'}
                </p>
              </Link>

              <Link
                href="/activities/cart"
                className={`group rounded-lg border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md ${
                  hasPendingSocialFee ? 'border-amber-300 bg-amber-50/70' : ''
                }`}
              >
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition group-hover:bg-primary group-hover:text-primary-foreground ${
                    hasPendingSocialFee
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  <CreditCard className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-xl font-semibold">
                  {hasPendingSocialFee ? 'Asociate al club' : 'Cuota social'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {hasPendingSocialFee
                    ? `${memberHomeSummary?.unpaidAdultCount ?? 1} integrante pendiente de cuota social.`
                    : 'Tu grupo familiar no muestra adultos pendientes de cuota social.'}
                </p>
              </Link>

              <Link
                href="/profile/children"
                className="group rounded-lg border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <HomeIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-xl font-semibold">Mi familia</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {memberHomeSummary
                    ? `${memberHomeSummary.childrenCount} hijo/a y ${memberHomeSummary.adultCount} adulto/a responsable.`
                    : 'Cargá y revisá los datos del grupo familiar.'}
                </p>
              </Link>
            </div>

            {hasPendingSocialFee && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    Hay integrantes con cuota social pendiente. Podés
                    regularizarla desde el carrito de actividades.
                  </p>
                  <Link
                    href="/activities/cart"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
                  >
                    Pagar cuota social
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            )}
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

            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                {showMemberSpace ? 'Tu espacio' : 'Sumate'}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Asociate al club
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Podés pagar solo la cuota social mensual para asociarte, sin
                inscribirte ahora en una actividad. Cuando quieras sumarte a una
                propuesta, lo hacés desde la agenda.
              </p>

              <div className="mt-5 grid gap-3">
                <Link
                  href={
                    isLoggedIn
                      ? '/activities/cart'
                      : '/register?returnTo=/activities/cart'
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  {isLoggedIn ? (
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isLoggedIn
                    ? 'Pagar cuota social'
                    : 'Crear cuenta y asociarme'}
                </Link>

                {showMemberSpace ? (
                  <Link
                    href="/my-activities"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
                  >
                    Ir a mis actividades
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <Link
                    href="#actividades"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
                  >
                    Ver actividades disponibles
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Próximas actividades y noticias */}
      <section id="actividades" className="px-4 pb-14">
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
