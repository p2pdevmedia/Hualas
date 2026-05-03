import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activityDayUpdateSchema } from '@/lib/validations/activity';
import { notifyActivityDayUpdated } from '@/lib/notifications/notification-service';

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
    include: { professors: { select: { userId: true } } },
  });

  if (!day) {
    return NextResponse.json({ error: 'Día no encontrado' }, { status: 404 });
  }

  const isAdmin =
    session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
  const isProfessorOfDay =
    session.user.role === 'PROFESSOR' &&
    day.professors.some((p) => p.userId === session.user.id);

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
      date: true,
      schedule: true,
      geoLocation: true,
    },
  });

  if (!day) {
    return NextResponse.json({ error: 'Día no encontrado' }, { status: 404 });
  }

  const data = activityDayUpdateSchema.parse(await req.json());
  const professorIds = Array.from(new Set(data.professorIds));
  const activityGroupId = data.activityGroupId ?? null;
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
  const validProfessors = await prisma.user.findMany({
    where: {
      id: { in: professorIds },
      roleAssignments: { some: { role: 'PROFESSOR' } },
      isActive: true,
    },
    select: { id: true },
  });
  if (validProfessors.length !== professorIds.length) {
    return NextResponse.json(
      { error: 'Uno o más profesores no son válidos' },
      { status: 400 }
    );
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
      professors: {
        deleteMany: {},
        create: professorIds.map((userId) => ({
          user: { connect: { id: userId } },
        })),
      },
    },
    include: {
      professors: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  const dateChanged = day.date.getTime() !== new Date(data.date).getTime();
  const scheduleChanged = day.schedule !== data.schedule;
  const geoChanged = day.geoLocation !== data.geoLocation;
  if (dateChanged || scheduleChanged || geoChanged) {
    notifyActivityDayUpdated(updatedDay.id).catch((err) =>
      console.error('[notifications] notifyActivityDayUpdated failed', err)
    );
  }

  return NextResponse.json(updatedDay);
}
