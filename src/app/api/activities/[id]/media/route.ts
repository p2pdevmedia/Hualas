import { del, put } from '@vercel/blob';
import { ActivityMediaType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extensionFor } from '@/lib/image-utils';
import { prisma } from '@/lib/prisma';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 80 * 1024 * 1024;

function isAdminSession(session: unknown) {
  const user = (
    session as { user?: { activeRole?: string; role?: string } } | null
  )?.user;
  const role = user?.activeRole ?? user?.role;
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

function getMediaType(file: File): ActivityMediaType | null {
  if (file.type.startsWith('image/')) return 'IMAGE';
  if (file.type.startsWith('video/')) return 'VIDEO';
  return null;
}

function mediaExtensionFor(file: File) {
  if (file.type.startsWith('image/')) return extensionFor(file);

  const videoExtensions: Record<string, string> = {
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'video/x-msvideo': '.avi',
  };

  const fallback = file.name.includes('.')
    ? file.name.slice(file.name.lastIndexOf('.'))
    : '';

  return (videoExtensions[file.type] ?? fallback) || '.mp4';
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const media = await prisma.activityMedia.findMany({
    where: { activityId: params.id },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      type: true,
      fileName: true,
      contentType: true,
      sortOrder: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ media });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const files = formData
    .getAll('media')
    .filter((file): file is File => file instanceof File && file.size > 0);

  if (files.length === 0) {
    return NextResponse.json(
      { error: 'No se recibieron archivos' },
      { status: 400 }
    );
  }

  const activity = await prisma.activity.findUnique({
    where: { id: params.id },
    select: { id: true },
  });

  if (!activity) {
    return NextResponse.json(
      { error: 'Actividad no encontrada' },
      { status: 404 }
    );
  }

  for (const file of files) {
    const mediaType = getMediaType(file);
    if (!mediaType) {
      return NextResponse.json(
        { error: 'Solo se permiten imágenes o videos' },
        { status: 400 }
      );
    }

    const maxSize = mediaType === 'IMAGE' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error:
            mediaType === 'IMAGE'
              ? 'Cada imagen debe pesar menos de 8 MB'
              : 'Cada video debe pesar menos de 80 MB',
        },
        { status: 400 }
      );
    }
  }

  const lastMedia = await prisma.activityMedia.findFirst({
    where: { activityId: params.id },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });
  let nextSortOrder = (lastMedia?.sortOrder ?? -1) + 1;
  const uploadedBlobUrls: string[] = [];
  const createdMediaIds: string[] = [];

  try {
    const created = [];
    for (const file of files) {
      const mediaType = getMediaType(file)!;
      const pathname = `activity-media/${params.id}/${crypto.randomUUID()}${mediaExtensionFor(file)}`;
      const blob = await put(pathname, file, {
        access: 'private',
        contentType: file.type,
      });
      uploadedBlobUrls.push(blob.url);

      const media = await prisma.activityMedia.create({
        data: {
          activityId: params.id,
          url: blob.url,
          type: mediaType,
          fileName: file.name || null,
          contentType: file.type || null,
          sortOrder: nextSortOrder++,
        },
        select: {
          id: true,
          type: true,
          fileName: true,
          contentType: true,
          sortOrder: true,
          createdAt: true,
        },
      });
      createdMediaIds.push(media.id);
      created.push(media);
    }

    return NextResponse.json({ media: created });
  } catch (error) {
    await prisma.activityMedia
      .deleteMany({ where: { id: { in: createdMediaIds } } })
      .catch(() => undefined);
    await Promise.all(
      uploadedBlobUrls.map((url) => del(url).catch(() => undefined))
    );
    console.error('[activity-media] upload failed', error);
    return NextResponse.json(
      { error: 'No se pudieron guardar los archivos' },
      { status: 500 }
    );
  }
}
