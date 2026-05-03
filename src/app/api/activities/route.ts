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
  const annualProfessorIds = Array.from(
    new Set(data.annualSchedules.flatMap((schedule) => schedule.professorIds))
  );
  const professorIdsToValidate = Array.from(
    new Set([...professorIds, ...annualProfessorIds])
  );
  if (professorIdsToValidate.length > 0) {
    const validProfessors = await prisma.user.findMany({
      where: {
        id: { in: professorIdsToValidate },
        roleAssignments: { some: { role: 'PROFESSOR' } },
        isActive: true,
      },
      select: { id: true },
    });
    if (validProfessors.length !== professorIdsToValidate.length) {
      return NextResponse.json(
        { error: 'Uno o más profesores no son válidos' },
        { status: 400 }
      );
    }
  }

  const created = await prisma.$transaction(
    async (tx) => {
      const activity = await tx.activity.create({
        data: {
          name: data.name,
          date: data.date,
          endDate: data.endDate,
          activityType: data.activityType,
          frequency: data.frequency,
          image: data.image ?? null,
          description: data.description ?? null,
          price: data.price,
          capacity: data.capacity ?? null,
        },
        select: { id: true },
      });

      const activityId = activity.id;

      if (professorIds.length > 0) {
        await tx.activityProfessor.createMany({
          data: professorIds.map((userId) => ({
            activityId,
            userId,
          })),
        });
      }

      const groupIdByTempId = new Map<string, string>();
      if (data.groups.length > 0) {
        for (const group of data.groups) {
          const createdGroup = await tx.activityGroup.create({
            data: {
              activityId,
              name: group.name,
              description: group.description,
            },
            select: { id: true },
          });
          groupIdByTempId.set(group.tempId, createdGroup.id);
        }
      }

      if (data.activityType === 'ANNUAL') {
        const annualScheduleProfessorIds = Array.from(
          new Set(
            data.annualSchedules.flatMap((schedule) => schedule.professorIds)
          )
        );
        const professorIdsForDays =
          annualScheduleProfessorIds.length > 0
            ? annualScheduleProfessorIds
            : professorIds;

        const annualDays = buildAnnualActivityDays(
          data.date,
          data.endDate,
          data.annualSchedules.map((s) => ({
            ...s,
            groupTempId: s.groupTempId ?? undefined,
          })),
          {
            description: data.description ?? undefined,
            geoLocation: data.geoLocation!,
            latitude: data.latitude!,
            longitude: data.longitude!,
            sportIcon: data.sportIcon ?? undefined,
          }
        );

        const dayData = annualDays.map((day) => {
          const activityGroupId = day.groupTempId
            ? groupIdByTempId.get(day.groupTempId)
            : null;
          if (day.groupTempId && !activityGroupId) {
            throw new Error('Una sesión anual referencia un grupo inválido');
          }
          return {
            activityId,
            createdById: session.user.id,
            date: day.date,
            schedule: day.schedule,
            description: day.description ?? null,
            activityGroupId: activityGroupId ?? null,
            sportIcon: day.sportIcon ?? null,
            geoLocation: day.geoLocation,
            latitude: day.latitude,
            longitude: day.longitude,
          };
        });

        if (professorIdsForDays.length > 0) {
          const createdDays = await tx.activityDay.createManyAndReturn({
            data: dayData,
            select: { id: true },
          });
          await tx.activityDayProfessor.createMany({
            data: createdDays.flatMap(({ id: activityDayId }, index) => {
              const sessionProfessorIds = annualDays[index]?.professorIds
                ?.length
                ? annualDays[index].professorIds
                : professorIdsForDays;
              return sessionProfessorIds.map((userId) => ({
                activityDayId,
                userId,
              }));
            }),
          });
        } else {
          await tx.activityDay.createMany({ data: dayData });
        }
      }

      return { id: activityId };
    },
    { timeout: 30000 }
  );
  return NextResponse.json(created);
}
