import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activityDayCreateSchema } from '@/lib/validations/activity';
import { notifyActivityDayCreated } from '@/lib/notifications/notification-service';

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
  const activityGroupId = data.activityGroupId;

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
    },
  });

  notifyActivityDayCreated(activityDay.id).catch((err) =>
    console.error('[notifications] notifyActivityDayCreated failed', err)
  );

  return NextResponse.json(activityDay);
}
