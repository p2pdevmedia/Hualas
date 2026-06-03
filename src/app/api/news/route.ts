import { del, put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession, type Session } from 'next-auth';
import { NewsMediaType, NewsScope } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyNewsCreated } from '@/lib/notifications/notification-service';
import {
  SAFE_IMAGE_SIGNATURE_KINDS,
  validateFileSignature,
} from '@/lib/security/file-signatures';
import { checkRateLimit } from '@/lib/security/rate-limit';

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

function videoExtensionForFile(file: File) {
  const videoExtensions: Record<string, string> = {
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/webm': '.webm',
    'video/x-msvideo': '.avi',
  };

  return (videoExtensions[file.type] ?? extensionForFile(file)) || '.mp4';
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

  const rate = checkRateLimit(`upload:news:${session.user.id}`, {
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

  const preparedFiles: Array<{
    file: File;
    contentType: string;
    extension: string;
    type: NewsMediaType;
  }> = [];

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

    if (type === 'IMAGE') {
      const validation = await validateFileSignature(
        file,
        SAFE_IMAGE_SIGNATURE_KINDS,
        'Cada imagen debe ser JPG, PNG, GIF o WebP válida'
      );
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      preparedFiles.push({
        file,
        contentType: validation.file.contentType,
        extension: validation.file.extension,
        type,
      });
    } else {
      preparedFiles.push({
        file,
        contentType: file.type,
        extension: videoExtensionForFile(file),
        type,
      });
    }
  }

  const uploaded: Array<{
    url: string;
    mimeType: string;
    type: NewsMediaType;
    fileName: string;
  }> = [];

  try {
    for (const prepared of preparedFiles) {
      const { contentType, extension, file, type } = prepared;
      const pathname = `news/${crypto.randomUUID()}${extension}`;
      const blob = await put(pathname, file, {
        access: 'private',
        contentType,
      });
      uploaded.push({
        url: blob.url,
        mimeType: contentType,
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
