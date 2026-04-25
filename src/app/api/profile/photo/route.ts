import { del, put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  const currentUser = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { profilePhoto: true },
  });

  const pathname = `profile-photos/${session.user.id}/${crypto.randomUUID()}${extensionFor(file)}`;
  const blob = await put(pathname, file, {
    access: 'public',
    contentType: file.type,
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

  return NextResponse.json({
    profilePhoto: blob.url,
  });
}
