import { del, get, put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { mobileChildSelect, serializeMobileChild } from '@/lib/mobile-children';
import { prisma } from '@/lib/prisma';

function extensionFor(file: File) {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/avif': '.avif',
    'image/heic': '.heic',
    'image/heif': '.heif',
  };

  const fallback = file.name.includes('.')
    ? file.name.slice(file.name.lastIndexOf('.'))
    : '';
  return mimeToExt[file.type] ?? (fallback || '.jpg');
}

async function getChild(childId: string, userId: string) {
  const ownerIds = await getAccessibleChildOwnerIds(userId);
  return prisma.child.findFirst({
    where: { id: childId, userId: { in: ownerIds } },
    select: { id: true, profilePhoto: true },
  });
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const child = await getChild(params.id, session.userId);
  if (!child?.profilePhoto) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const blob = await get(child.profilePhoto, { access: 'private' });
  if (!blob || blob.statusCode !== 200) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const headers = Object.fromEntries(blob.headers.entries());
  headers['Cache-Control'] = 'private, no-store, max-age=0';

  return new NextResponse(blob.stream, { headers });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const child = await getChild(params.id, session.userId);
  if (!child) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
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

  const pathname = `children-photos/${child.id}/${crypto.randomUUID()}${extensionFor(file)}`;
  const blob = await put(pathname, file, {
    access: 'private',
    contentType: file.type,
  });

  try {
    const updated = await prisma.child.update({
      where: { id: child.id },
      data: { profilePhoto: blob.url },
      select: mobileChildSelect,
    });

    if (child.profilePhoto) {
      await del(child.profilePhoto).catch(() => undefined);
    }

    return NextResponse.json({
      ok: true,
      child: serializeMobileChild(updated),
    });
  } catch {
    await del(blob.url).catch(() => undefined);
    return NextResponse.json(
      { error: 'No se pudo guardar la foto' },
      { status: 500 }
    );
  }
}
