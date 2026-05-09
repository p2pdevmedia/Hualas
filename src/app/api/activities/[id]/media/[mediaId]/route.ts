import { del, get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function isAdminSession(session: unknown) {
  const user = (
    session as { user?: { activeRole?: string; role?: string } } | null
  )?.user;
  const role = user?.activeRole ?? user?.role;
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string; mediaId: string } }
) {
  const media = await prisma.activityMedia.findFirst({
    where: { id: params.mediaId, activityId: params.id },
    select: { url: true },
  });

  if (!media) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const blob = await get(media.url, { access: 'private' });
    if (!blob || blob.statusCode !== 200) {
      return new NextResponse(null, { status: 404 });
    }

    const headers = Object.fromEntries(blob.headers.entries());
    headers['Cache-Control'] = 'public, max-age=300, stale-while-revalidate=60';

    return new NextResponse(blob.stream, { headers });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; mediaId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const media = await prisma.activityMedia.findFirst({
    where: { id: params.mediaId, activityId: params.id },
    select: { id: true, url: true },
  });

  if (!media) {
    return NextResponse.json(
      { error: 'Archivo no encontrado' },
      { status: 404 }
    );
  }

  await del(media.url).catch(() => undefined);
  await prisma.activityMedia.delete({ where: { id: media.id } });

  return NextResponse.json({ ok: true });
}
