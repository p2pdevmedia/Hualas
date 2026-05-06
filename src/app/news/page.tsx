import Image from 'next/image';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { NewsScope, type Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getReadableActivityIds, isNewsAdminRole } from '@/lib/news-access';
import CreateNewsForm from './create-news-form';

type NewsWithRelations = Prisma.NewsGetPayload<{
  include: {
    activity: { select: { name: true } };
    createdBy: { select: { name: true; lastName: true } };
    media: true;
  };
}>;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function creatorName(news: NewsWithRelations) {
  const parts = [news.createdBy.name, news.createdBy.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Administración';
}

export default async function NewsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const role = session.user.activeRole ?? session.user.role;
  const isAdmin = isNewsAdminRole(role);
  const readableActivityIds = await getReadableActivityIds({
    userId: session.user.id,
    role,
  });

  const where: Prisma.NewsWhereInput = isAdmin
    ? {}
    : {
        OR: [
          { scope: NewsScope.CLUB },
          ...(readableActivityIds && readableActivityIds.length > 0
            ? [
                {
                  scope: NewsScope.ACTIVITY,
                  activityId: { in: readableActivityIds },
                },
              ]
            : []),
        ],
      };

  const [news, activities] = await Promise.all([
    prisma.news.findMany({
      where,
      include: {
        activity: { select: { name: true } },
        createdBy: { select: { name: true, lastName: true } },
        media: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    isAdmin
      ? prisma.activity.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Club Hualas
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Noticias</h1>
        <p className="max-w-2xl text-muted-foreground">
          Comunicados institucionales y novedades de tus actividades.
        </p>
      </header>

      {isAdmin && <CreateNewsForm activities={activities} />}

      {news.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold">Todavía no hay noticias</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuando administración publique novedades, vas a encontrarlas acá.
          </p>
        </div>
      ) : (
        <section className="space-y-4" aria-label="Listado de noticias">
          {news.map((item) => (
            <article
              id={item.id}
              key={item.id}
              className="scroll-mt-24 rounded-2xl border bg-card p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {item.scope === 'CLUB'
                      ? 'Para todo el club'
                      : (item.activity?.name ?? 'Actividad')}
                  </span>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {item.title}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(item.createdAt)}
                </p>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                Publicado por {creatorName(item)}
              </p>

              <div className="mt-4 whitespace-pre-wrap leading-7 text-foreground/90">
                {item.body}
              </div>

              {item.media.length > 0 && (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {item.media.map((media) => {
                    const src = `/api/news/${media.id}/media`;
                    return media.type === 'IMAGE' ? (
                      <div
                        key={media.id}
                        className="relative aspect-video overflow-hidden rounded-xl border bg-muted"
                      >
                        <Image
                          src={src}
                          alt={media.fileName ?? item.title}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="(min-width: 768px) 50vw, 100vw"
                        />
                      </div>
                    ) : (
                      <video
                        key={media.id}
                        src={src}
                        controls
                        className="aspect-video w-full rounded-xl border bg-black"
                      >
                        Tu navegador no puede reproducir este video.
                      </video>
                    );
                  })}
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
