import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse(null, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { profilePhoto: true },
  });

  if (!user?.profilePhoto) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const blob = await get(user.profilePhoto, { access: 'private' });
    if (!blob || blob.statusCode !== 200) {
      return new NextResponse(null, { status: 404 });
    }

    const headers = Object.fromEntries(blob.headers.entries());
    headers['Cache-Control'] = 'private, no-store, max-age=0';

    return new NextResponse(blob.stream, { headers });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
