import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activityDayCreateSchema } from '@/lib/validations/activity';
import {
  notifyActivityDayCreated,
  notifyProfessorGroupAssigned,
} from '@/lib/notifications/notification-service';

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

  const activity = await prisma.activity.findUnique({
    where: { id: params.id },
    select: {
      id: true,
    },
  });

  if (!activity) {
    return NextResponse.json(
      { error: 'Actividad no encontrada' },
      { status: 404 }
    );
  }

  const data = activityDayCreateSchema.parse(await req.json());
  const professorIds = Array.from(new Set(data.professorIds));
  const activityGroupId = data.activityGroupId ?? null;
  if (activityGroupId) {
    const group = await prisma.activityGroup.findFirst({
      where: {
        id: activityGroupId,
        activityId: activity.id,
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

  const activityDay = await prisma.activityDay.create({
    data: {
      activityId: activity.id,
      createdById: session.user.id,
      date: data.date,
      schedule: data.schedule,
      description: data.description,
      geoLocation: data.geoLocation,
      latitude: data.latitude,
      longitude: data.longitude,
      activityGroupId,
      sportIcon: data.sportIcon ?? null,
      professors: {
        create: professorIds.map((userId) => ({
          user: { connect: { id: userId } },
        })),
      },
    },
  });

  notifyActivityDayCreated(activityDay.id).catch((err) =>
    console.error('[notifications] notifyActivityDayCreated failed', err)
  );

  if (activityGroupId) {
    notifyProfessorGroupAssigned(
      activity.id,
      activityGroupId,
      professorIds
    ).catch((err) =>
      console.error('[notifications] notifyProfessorGroupAssigned failed', err)
    );
  }

  return NextResponse.json(activityDay);
}
