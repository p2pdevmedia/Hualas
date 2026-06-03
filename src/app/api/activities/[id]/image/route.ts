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

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const activity = await prisma.activity.findUnique({
    where: { id: params.id },
    select: { image: true },
  });

  if (!activity?.image) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const blob = await get(activity.image, { access: 'private' });
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

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(`upload:activity-image:${session.user.id}`, {
    limit: 20,
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
  const file = formData.get('image');

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'No se recibió ninguna imagen' },
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
      { error: 'La imagen debe pesar menos de 5 MB' },
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

  const activity = await prisma.activity.findUnique({
    where: { id: params.id },
    select: { image: true },
  });

  if (!activity) {
    return NextResponse.json(
      { error: 'Actividad no encontrada' },
      { status: 404 }
    );
  }

  const pathname = `activity-images/${params.id}/${crypto.randomUUID()}${validation.file.extension}`;
  const blob = await put(pathname, file, {
    access: 'private',
    contentType: validation.file.contentType,
  });

  try {
    await prisma.activity.update({
      where: { id: params.id },
      data: { image: blob.url },
    });
  } catch {
    await del(blob.url).catch(() => undefined);
    return NextResponse.json(
      { error: 'No se pudo guardar la imagen' },
      { status: 500 }
    );
  }

  if (activity.image) {
    await del(activity.image).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const activity = await prisma.activity.findUnique({
    where: { id: params.id },
    select: { image: true },
  });

  if (!activity || !activity.image) {
    return NextResponse.json(
      { error: 'Imagen no encontrada' },
      { status: 404 }
    );
  }

  await del(activity.image).catch(() => undefined);

  await prisma.activity.update({
    where: { id: params.id },
    data: { image: null },
  });

  return NextResponse.json({ ok: true });
}
