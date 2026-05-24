import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildAnnualActivityDays } from '@/lib/activities/annual-schedule';
import { activityCreateSchema } from '@/lib/validations/activity';
import {
  notifyProfessorActivityAssigned,
  notifyProfessorGroupAssigned,
} from '@/lib/notifications/notification-service';

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
  const groupProfessorIds = Array.from(
    new Set(data.groups.flatMap((group) => group.professorIds))
  );
  const professorIdsToValidate = Array.from(
    new Set([...professorIds, ...groupProfessorIds])
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
              capacity: group.capacity,
              minAge: group.minAge,
              maxAge: group.maxAge,
            },
            select: { id: true },
          });
          groupIdByTempId.set(group.tempId, createdGroup.id);
          await tx.activityGroupProfessor.createMany({
            data: group.professorIds.map((userId) => ({
              activityGroupId: createdGroup.id,
              userId,
            })),
          });
        }
      }

      if (data.activityType === 'ANNUAL') {
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

        await tx.activityDay.createMany({ data: dayData });
      }

      const groupAssignments = new Map<string, Set<string>>();
      for (const group of data.groups) {
        const groupId = groupIdByTempId.get(group.tempId);
        if (!groupId) continue;
        groupAssignments.set(groupId, new Set(group.professorIds));
      }

      return {
        id: activityId,
        assignedProfessorIds: professorIds,
        groupAssignments: Array.from(groupAssignments, ([groupId, ids]) => ({
          groupId,
          professorIds: Array.from(ids),
        })),
      };
    },
    { timeout: 30000 }
  );
  notifyProfessorActivityAssigned(
    created.id,
    created.assignedProfessorIds
  ).catch((err) =>
    console.error('[notifications] notifyProfessorActivityAssigned failed', err)
  );

  for (const assignment of created.groupAssignments) {
    notifyProfessorGroupAssigned(
      created.id,
      assignment.groupId,
      assignment.professorIds
    ).catch((err) =>
      console.error('[notifications] notifyProfessorGroupAssigned failed', err)
    );
  }

  return NextResponse.json({ id: created.id });
}
