import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildAnnualActivityDays } from '@/lib/activities/annual-schedule';
import { activityUpdateSchema } from '@/lib/validations/activity';

export async function PUT(
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
  const data = activityUpdateSchema.parse(await req.json());
  const professorIds = Array.from(new Set(data.professorIds ?? []));
  if (data.professorIds !== undefined && professorIds.length > 0) {
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
  }

  const activity = await prisma
    .$transaction(async (tx) => {
      const updatedActivity = await tx.activity.update({
        where: { id: params.id },
        data: {
          name: data.name,
          date: data.date,
          endDate: data.endDate,
          activityType: data.activityType,
          frequency: data.frequency,
          ...(data.image !== undefined ? { image: data.image } : {}),
          description: data.description ?? null,
          price: data.price,
          capacity: data.capacity ?? null,
        },
        select: { id: true },
      });

      const activityId = updatedActivity.id;

      await tx.activityProfessor.deleteMany({
        where: { activityId },
      });

      if (professorIds.length > 0) {
        await tx.activityProfessor.createMany({
          data: professorIds.map((userId) => ({
            activityId,
            userId,
          })),
        });
      }

      const shouldDeleteDays =
        data.activityType === 'TEMPORARY' ||
        (data.activityType === 'ANNUAL' && data.annualSchedules.length > 0);

      if (shouldDeleteDays) {
        await tx.activityDay.deleteMany({ where: { activityId } });
      }

      if (data.activityType === 'ANNUAL' && data.annualSchedules.length > 0) {
        const annualDays = buildAnnualActivityDays(
          data.date,
          data.endDate,
          data.annualSchedules.map((s) => ({
            weekday: s.weekday,
            schedule: s.schedule,
            description: s.description,
            sportIcon: s.sportIcon ?? undefined,
            geoLocation: s.geoLocation,
            latitude: s.latitude,
            longitude: s.longitude,
          }))
        );

        const dayData = annualDays.map((day) => {
          const schedule = data.annualSchedules.find(
            (s) =>
              s.weekday === day.weekday &&
              s.schedule === day.schedule &&
              s.geoLocation === day.geoLocation
          );
          return {
            activityId,
            createdById: session.user.id,
            date: day.date,
            schedule: day.schedule,
            description: day.description ?? null,
            activityGroupId: schedule?.groupId ?? null,
            sportIcon: day.sportIcon ?? null,
            geoLocation: day.geoLocation,
            latitude: day.latitude,
            longitude: day.longitude,
          };
        });

        if (professorIds.length > 0) {
          const createdDays = await tx.activityDay.createManyAndReturn({
            data: dayData,
            select: { id: true },
          });
          await tx.activityDayProfessor.createMany({
            data: createdDays.flatMap(({ id: activityDayId }) =>
              professorIds.map((userId) => ({ activityDayId, userId }))
            ),
          });
        } else {
          await tx.activityDay.createMany({ data: dayData });
        }
      }

      return { id: activityId };
    }, { timeout: 30000 })
    .catch((error) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return null;
      }

      throw error;
    });

  if (!activity) {
    return NextResponse.json(
      { error: 'Actividad no encontrada' },
      { status: 404 }
    );
  }

  return NextResponse.json(activity);
}

export async function DELETE(
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
    include: { participants: true },
  });

  if (!activity) {
    return NextResponse.json(
      { error: 'Actividad no encontrada' },
      { status: 404 }
    );
  }

  if (activity.participants.length > 0) {
    return NextResponse.json(
      { error: 'No se puede borrar una actividad con inscritos' },
      { status: 400 }
    );
  }

  await prisma.activity.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
