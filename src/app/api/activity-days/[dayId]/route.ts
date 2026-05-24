import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activityDayUpdateSchema } from '@/lib/validations/activity';
import { notifyActivityDayUpdated } from '@/lib/notifications/notification-service';

function isProfessorAssignedToDay(
  day: {
    activity: { professors: Array<{ userId: string }> };
    activityGroup: { professors: Array<{ userId: string }> } | null;
  },
  userId: string
) {
  const groupProfessors = day.activityGroup?.professors;
  if (groupProfessors != null) {
    return groupProfessors.some((p) => p.userId === userId);
  }

  return day.activity.professors.some((p) => p.userId === userId);
}

export async function PATCH(
  req: Request,
  { params }: { params: { dayId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const day = await prisma.activityDay.findUnique({
    where: { id: params.dayId },
    include: {
      activity: { select: { professors: { select: { userId: true } } } },
      activityGroup: { select: { professors: { select: { userId: true } } } },
    },
  });

  if (!day) {
    return NextResponse.json({ error: 'Dia no encontrado' }, { status: 404 });
  }

  const isAdmin =
    session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
  const isProfessorOfDay =
    session.user.role === 'PROFESSOR' &&
    isProfessorAssignedToDay(day, session.user.id);

  if (!isAdmin && !isProfessorOfDay) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const data: Record<string, string | null> = {};
  if ('description' in body)
    data.description =
      typeof body.description === 'string' ? body.description || null : null;
  if ('planificacion' in body)
    data.planificacion =
      typeof body.planificacion === 'string'
        ? body.planificacion || null
        : null;
  if ('devolucion' in body)
    data.devolucion =
      typeof body.devolucion === 'string' ? body.devolucion || null : null;

  const updatedDay = await prisma.activityDay.update({
    where: { id: day.id },
    data,
  });

  return NextResponse.json(updatedDay);
}

export async function PUT(
  req: Request,
  { params }: { params: { dayId: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const day = await prisma.activityDay.findUnique({
    where: { id: params.dayId },
    select: {
      id: true,
      activityId: true,
    },
  });

  if (!day) {
    return NextResponse.json({ error: 'Dia no encontrado' }, { status: 404 });
  }

  const data = activityDayUpdateSchema.parse(await req.json());
  const activityGroupId = data.activityGroupId;

  if (activityGroupId) {
    const group = await prisma.activityGroup.findFirst({
      where: {
        id: activityGroupId,
        activityId: day.activityId,
      },
      select: { id: true },
    });

    if (!group) {
      return NextResponse.json(
        { error: 'El grupo no pertenece a esta actividad' },
        { status: 400 }
      );
    }
  }

  const updatedDay = await prisma.activityDay.update({
    where: { id: day.id },
    data: {
      date: data.date,
      schedule: data.schedule,
      description: data.description,
      geoLocation: data.geoLocation,
      latitude: data.latitude,
      longitude: data.longitude,
      activityGroupId,
      sportIcon: data.sportIcon ?? null,
    },
  });

  notifyActivityDayUpdated(updatedDay.id).catch((err) =>
    console.error('[notifications] notifyActivityDayUpdated failed', err)
  );

  return NextResponse.json(updatedDay);
}

export async function DELETE(
  req: Request,
  { params }: { params: { dayId: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    ids?: unknown;
  };

  if (Array.isArray(body.ids)) {
    const ids = body.ids.filter(
      (value): value is string => typeof value === 'string'
    );

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'No se recibieron sesiones validas para eliminar' },
        { status: 400 }
      );
    }

    const result = await prisma.activityDay.deleteMany({
      where: { id: { in: ids } },
    });
    return NextResponse.json({ deletedCount: result.count });
  }

  await prisma.activityDay.delete({ where: { id: params.dayId } });
  return NextResponse.json({ ok: true });
}
