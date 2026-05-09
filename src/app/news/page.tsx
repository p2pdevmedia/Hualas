import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import type { Prisma, Role } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getReadableActivityIds, isNewsAdminRole } from '@/lib/news-access';
import CreateNewsForm from './create-news-form';
import NewsList, { type NewsListItem } from './news-list';

type NewsWithRelations = Prisma.NewsGetPayload<{
  include: {
    activity: { select: { name: true } };
    createdBy: { select: { name: true; lastName: true } };
    media: true;
    readReceipts: { select: { readAt: true } };
  };
}>;

type ActivityOption = {
  id: string;
  name: string;
};

type NewsPageData = {
  news: NewsListItem[];
  activities: ActivityOption[];
};

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

async function loadNewsPageData({
  isAdmin,
  userId,
  role,
}: {
  isAdmin: boolean;
  userId: string;
  role: Role;
}): Promise<NewsPageData> {
  const readableActivityIds = await getReadableActivityIds({ userId, role });

  const readableActivityWhere: Prisma.NewsWhereInput[] = [
    { scope: 'CLUB' },
    ...(readableActivityIds && readableActivityIds.length > 0
      ? [
          {
            scope: 'ACTIVITY' as const,
            activityId: { in: readableActivityIds },
          },
        ]
      : []),
  ];

  const where: Prisma.NewsWhereInput = isAdmin
    ? {}
    : { OR: readableActivityWhere };

  const [news, activities] = await Promise.all([
    prisma.news.findMany({
      where,
      include: {
        activity: { select: { name: true } },
        createdBy: { select: { name: true, lastName: true } },
        media: { orderBy: { createdAt: 'asc' } },
        readReceipts: {
          where: { userId },
          select: { readAt: true },
          take: 1,
        },
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

  return {
    news: news.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      scopeLabel:
        item.scope === 'CLUB'
          ? 'Para todo el club'
          : (item.activity?.name ?? 'Actividad'),
      createdAtLabel: formatDate(item.createdAt),
      creatorLabel: creatorName(item),
      isRead: item.readReceipts.length > 0,
      media: item.media.map((media) => ({
        id: media.id,
        type: media.type,
        fileName: media.fileName,
      })),
    })),
    activities,
  };
}

export default async function NewsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const role = session.user.activeRole ?? session.user.role;
  const isAdmin = isNewsAdminRole(role);

  let pageData: NewsPageData;
  let loadError = false;
  try {
    pageData = await loadNewsPageData({
      isAdmin,
      userId: session.user.id,
      role,
    });
  } catch (err) {
    console.error('[news] failed to render news page', err);
    loadError = true;
    pageData = { news: [], activities: [] };
  }

  const { news, activities } = pageData;

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

      {loadError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-destructive">
            No pudimos cargar las noticias
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Intentá actualizar la página en unos minutos. Si el problema
            continúa, avisale a administración.
          </p>
        </div>
      ) : news.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold">Todavía no hay noticias</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuando administración publique novedades, vas a encontrarlas acá.
          </p>
        </div>
      ) : (
        <NewsList items={news} />
      )}
    </main>
  );
}
