import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activityDayCreateSchema } from '@/lib/validations/activity';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const activity = await prisma.activity.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      professors: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!activity) {
    return NextResponse.json(
      { error: 'Actividad no encontrada' },
      { status: 404 }
    );
  }

  const isAdmin =
    session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
  const isAssignedProfessor = activity.professors.some(
    (assignment) => assignment.userId === session.user.id
  );

  if (!isAdmin && !isAssignedProfessor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = activityDayCreateSchema.parse(await req.json());
  const activityDay = await prisma.activityDay.create({
    data: {
      activityId: activity.id,
      createdById: session.user.id,
      date: data.date,
      schedule: data.schedule,
      description: data.description,
      geoLocation: data.geoLocation,
    },
  });

  return NextResponse.json(activityDay);
}
