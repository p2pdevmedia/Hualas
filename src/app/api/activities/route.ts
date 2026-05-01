import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildAnnualActivityDays } from '@/lib/activities/annual-schedule';
import { activityCreateSchema } from '@/lib/validations/activity';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = activityCreateSchema.parse(await req.json());
  const professorIds = Array.from(new Set(data.professorIds ?? []));
  if (professorIds.length > 0) {
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
  }

  const created = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "Activity" (
        "name",
        "date",
        "endDate",
        "activityType",
        "frequency",
        "image",
        "description",
        "price",
        "capacity"
      )
      VALUES (
        ${data.name},
        ${data.date},
        ${data.endDate},
        CAST(${data.activityType} AS "ActivityType"),
        CAST(${data.frequency} AS "ActivityFrequency"),
        ${data.image ?? null},
        ${data.description ?? null},
        ${data.price},
        ${data.capacity ?? null}
      )
      RETURNING "id"
    `;

    const activityId = rows[0]?.id;

    if (!activityId) {
      throw new Error('No se pudo crear la actividad');
    }

    if (professorIds.length > 0) {
      await tx.activityProfessor.createMany({
        data: professorIds.map((userId) => ({
          activityId,
          userId,
        })),
      });
    }

    if (data.activityType === 'ANNUAL') {
      const annualDays = buildAnnualActivityDays(
        data.date,
        data.endDate,
        data.annualSchedules
      );

      for (const day of annualDays) {
        const activityDay = await tx.activityDay.create({
          data: {
            activityId,
            createdById: session.user.id,
            date: day.date,
            schedule: day.schedule,
            description: day.description,
            geoLocation: day.geoLocation,
            latitude: day.latitude,
            longitude: day.longitude,
          },
        });

        await tx.activityDayProfessor.createMany({
          data: professorIds.map((userId) => ({
            activityDayId: activityDay.id,
            userId,
          })),
        });
      }
    }

    return { id: activityId };
  });
  return NextResponse.json(created);
}
