import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activityDayUpdateSchema } from '@/lib/validations/activity';

export async function PUT(
  req: Request,
  { params }: { params: { dayId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const day = await prisma.activityDay.findUnique({
    where: { id: params.dayId },
    select: {
      id: true,
      activityId: true,
      professors: {
        select: {
          userId: true,
        },
      },
      activity: {
        select: {
          professors: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
  });

  if (!day) {
    return NextResponse.json({ error: 'Día no encontrado' }, { status: 404 });
  }

  const isAdmin =
    session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
  const isActivityProfessor = day.activity.professors.some(
    (assignment) => assignment.userId === session.user.id
  );
  const isDayProfessor = day.professors.some(
    (assignment) => assignment.userId === session.user.id
  );

  if (
    !isAdmin &&
    session.user.role !== 'PROFESSOR' &&
    !isActivityProfessor &&
    !isDayProfessor
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = activityDayUpdateSchema.parse(await req.json());
  const professorIds = Array.from(new Set(data.professorIds));
  const validProfessors = await prisma.user.findMany({
    where: {
      id: { in: professorIds },
      role: 'PROFESSOR',
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

  return NextResponse.json(updatedDay);
}
