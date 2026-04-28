import { del, put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { extensionFor } from '@/lib/image-utils';

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

  const pathname = `activity-images/${params.id}/${crypto.randomUUID()}${extensionFor(file)}`;
  const blob = await put(pathname, file, {
    access: 'public',
    contentType: file.type,
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
