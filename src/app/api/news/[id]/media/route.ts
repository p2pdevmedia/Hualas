import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canUserReadNews } from '@/lib/news-access';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new NextResponse(null, { status: 401 });
  }

  const media = await prisma.newsMedia.findUnique({
    where: { id: params.id },
    select: { url: true, mimeType: true, newsId: true },
  });

  if (!media) {
    return new NextResponse(null, { status: 404 });
  }

  const canRead = await canUserReadNews({
    userId: session.user.id,
    role: session.user.activeRole ?? session.user.role,
    newsId: media.newsId,
  });

  if (!canRead) {
    return new NextResponse(null, { status: 403 });
  }

  try {
    const blob = await get(media.url, { access: 'private' });
    if (!blob || blob.statusCode !== 200) {
      return new NextResponse(null, { status: 404 });
    }

    const headers = Object.fromEntries(blob.headers.entries());
    headers['Content-Type'] = media.mimeType;
    headers['Cache-Control'] = 'private, max-age=300';

    return new NextResponse(blob.stream, { headers });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
