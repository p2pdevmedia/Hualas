import { NextResponse } from 'next/server';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { markReadableNewsAsRead } from '@/lib/news-read-status';

const MAX_NEWS_PER_REQUEST = 50;

function parseNewsIds(input: unknown) {
  if (Array.isArray(input)) {
    return input
      .filter((id): id is string => typeof id === 'string')
      .slice(0, MAX_NEWS_PER_REQUEST);
  }

  if (typeof input === 'string') return [input];

  return [];
}

export async function POST(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'La solicitud no tiene un JSON válido' },
      { status: 400 }
    );
  }

  const newsIds = parseNewsIds(
    (payload as { newsIds?: unknown; newsId?: unknown }).newsIds ??
      (payload as { newsId?: unknown }).newsId
  );

  if (newsIds.length === 0) {
    return NextResponse.json(
      { error: 'Seleccioná al menos una noticia' },
      { status: 400 }
    );
  }

  const result = await markReadableNewsAsRead({
    userId: session.userId,
    role: session.appRole,
    newsIds,
  });

  return NextResponse.json({ ok: true, ...result });
}
