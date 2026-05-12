import { NextResponse } from 'next/server';
import { getServerSession, type Session } from 'next-auth';
import { NewsScope } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function isAdminSession(session: Session | null) {
  const role = session?.user.activeRole ?? session?.user.role;
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
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

  const news = await prisma.news.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!news) {
    return NextResponse.json(
      { error: 'Noticia no encontrada' },
      { status: 404 }
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

  try {
    const updated = await prisma.news.update({
      where: { id: params.id },
      data: {
        title,
        body,
        scope,
        activityId: scope === 'ACTIVITY' ? activityId : null,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (err) {
    console.error('[news] update failed', err);
    return NextResponse.json(
      { error: 'No se pudo actualizar la noticia' },
      { status: 500 }
    );
  }
}
