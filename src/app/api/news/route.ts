import { del, put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession, type Session } from 'next-auth';
import { NewsMediaType, NewsScope } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyNewsCreated } from '@/lib/notifications/notification-service';

const MAX_MEDIA_FILES = 6;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 80 * 1024 * 1024;

function isAdminSession(session: Session | null) {
  const role = session?.user.activeRole ?? session?.user.role;
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

function extensionForFile(file: File) {
  const name = file.name.trim();
  const dot = name.lastIndexOf('.');
  if (dot >= 0 && dot < name.length - 1) {
    return name
      .slice(dot)
      .toLowerCase()
      .replace(/[^.a-z0-9]/g, '');
  }
  const subtype = file.type.split('/')[1]?.split(';')[0];
  return subtype ? `.${subtype.replace(/[^a-z0-9]/gi, '').toLowerCase()}` : '';
}

function mediaTypeFor(file: File): NewsMediaType | null {
  if (file.type.startsWith('image/')) return 'IMAGE';
  if (file.type.startsWith('video/')) return 'VIDEO';
  return null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdminSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const scopeInput = String(formData.get('scope') ?? 'CLUB');
  const activityId = String(formData.get('activityId') ?? '').trim();
  const scope = scopeInput === 'ACTIVITY' ? NewsScope.ACTIVITY : NewsScope.CLUB;
  const files = formData
    .getAll('media')
    .filter((file): file is File => file instanceof File && file.size > 0);

  if (!title) {
    return NextResponse.json(
      { error: 'El título de la noticia es obligatorio' },
      { status: 400 }
    );
  }

  if (!body) {
    return NextResponse.json(
      { error: 'El texto de la noticia es obligatorio' },
      { status: 400 }
    );
  }

  if (title.length > 160) {
    return NextResponse.json(
      { error: 'El título debe tener menos de 160 caracteres' },
      { status: 400 }
    );
  }

  if (scope === 'ACTIVITY' && !activityId) {
    return NextResponse.json(
      { error: 'Seleccioná una actividad para esta noticia' },
      { status: 400 }
    );
  }

  if (files.length > MAX_MEDIA_FILES) {
    return NextResponse.json(
      { error: `Podés cargar hasta ${MAX_MEDIA_FILES} archivos` },
      { status: 400 }
    );
  }

  if (scope === 'ACTIVITY') {
    const activityExists = await prisma.activity.count({
      where: { id: activityId },
    });
    if (!activityExists) {
      return NextResponse.json(
        { error: 'Actividad no encontrada' },
        { status: 404 }
      );
    }
  }

  for (const file of files) {
    const type = mediaTypeFor(file);
    if (!type) {
      return NextResponse.json(
        { error: 'Solo se permiten imágenes o videos' },
        { status: 400 }
      );
    }
    const maxSize = type === 'IMAGE' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error:
            type === 'IMAGE'
              ? 'Cada imagen debe pesar menos de 8 MB'
              : 'Cada video debe pesar menos de 80 MB',
        },
        { status: 400 }
      );
    }
  }

  const uploaded: Array<{
    url: string;
    mimeType: string;
    type: NewsMediaType;
    fileName: string;
  }> = [];

  try {
    for (const file of files) {
      const type = mediaTypeFor(file);
      if (!type) continue;
      const pathname = `news/${crypto.randomUUID()}${extensionForFile(file)}`;
      const blob = await put(pathname, file, {
        access: 'private',
        contentType: file.type,
      });
      uploaded.push({
        url: blob.url,
        mimeType: file.type,
        type,
        fileName: file.name,
      });
    }

    const news = await prisma.news.create({
      data: {
        title,
        body,
        scope,
        activityId: scope === 'ACTIVITY' ? activityId : null,
        createdById: session.user.id,
        media: uploaded.length
          ? {
              create: uploaded.map((media) => ({
                url: media.url,
                mimeType: media.mimeType,
                type: media.type,
                fileName: media.fileName,
              })),
            }
          : undefined,
      },
      select: { id: true },
    });

    await notifyNewsCreated(news.id);

    return NextResponse.json({ ok: true, id: news.id }, { status: 201 });
  } catch (err) {
    await Promise.all(
      uploaded.map((file) => del(file.url).catch(() => undefined))
    );
    console.error('[news] create failed', err);
    return NextResponse.json(
      { error: 'No se pudo crear la noticia' },
      { status: 500 }
    );
  }
}
