import { del, get, put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  SAFE_IMAGE_SIGNATURE_KINDS,
  validateFileSignature,
} from '@/lib/security/file-signatures';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(`upload:profile:${session.user.id}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas subidas. Probá de nuevo en unos segundos.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rate.retryAfterSeconds) },
      }
    );
  }

  const formData = await req.formData();
  const file = formData.get('photo');

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'No se recibió ninguna foto' },
      { status: 400 }
    );
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json(
      { error: 'El archivo debe ser una imagen' },
      { status: 400 }
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'La foto debe pesar menos de 5 MB' },
      { status: 400 }
    );
  }

  const validation = await validateFileSignature(
    file,
    SAFE_IMAGE_SIGNATURE_KINDS,
    'El archivo debe ser una imagen JPG, PNG, GIF o WebP válida'
  );
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { profilePhoto: true },
  });

  const pathname = `profile-photos/${session.user.id}/${crypto.randomUUID()}${validation.file.extension}`;
  const blob = await put(pathname, file, {
    access: 'private',
    contentType: validation.file.contentType,
  });

  try {
    await prisma.user.update({
      where: { id: (session.user as any).id },
      data: { profilePhoto: blob.url },
    });
  } catch {
    await del(blob.url).catch(() => undefined);
    return NextResponse.json(
      { error: 'No se pudo guardar la foto de perfil' },
      { status: 500 }
    );
  }

  if (currentUser?.profilePhoto) {
    await del(currentUser.profilePhoto).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { profilePhoto: true },
  });

  if (!currentUser?.profilePhoto) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const blob = await get(currentUser.profilePhoto, { access: 'private' });
  if (!blob || blob.statusCode !== 200) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const headers = Object.fromEntries(blob.headers.entries());
  headers['Cache-Control'] = 'private, no-store, max-age=0';

  return new NextResponse(blob.stream, {
    headers,
  });
}
