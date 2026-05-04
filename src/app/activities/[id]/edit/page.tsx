import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getActivityBaseRecordById } from '@/lib/activities/activity-records';
import { prisma } from '@/lib/prisma';
import { gateAdmin } from '@/lib/role-guards';
import EditActivityForm from './form';
import ActivityImageUpload from '../../activity-image-upload';

interface EditActivityPageProps {
  params: { id: string };
}

export default async function EditActivityPage({
  params,
}: EditActivityPageProps) {
  const session = await getServerSession(authOptions);
  const block = gateAdmin(session);
  if (block) return block;
  const activity = await getActivityBaseRecordById(params.id);
  if (!activity) {
    redirect('/activities');
  }

  const [
    professors,
    groups,
    activityProfessorAssignments,
    existingDayCount,
    firstAnnualDay,
    annualCalendarSample,
  ] = await Promise.all([
    prisma.user.findMany({
      where: {
        roleAssignments: { some: { role: 'PROFESSOR' } },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
      },
      orderBy: [{ name: 'asc' }, { lastName: 'asc' }],
    }),
    prisma.activityGroup.findMany({
      where: { activityId: params.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, description: true },
    }),
    prisma.activityProfessor.findMany({
      where: { activityId: params.id },
      select: { userId: true },
    }),
    prisma.activityDay.count({ where: { activityId: params.id } }),
    prisma.activityDay.findFirst({
      where: { activityId: params.id },
      orderBy: { date: 'asc' },
      select: {
        geoLocation: true,
        latitude: true,
        longitude: true,
        sportIcon: true,
        description: true,
      },
    }),
    prisma.activityDay.findMany({
      where: {
        activityId: params.id,
        date: {
          gte: activity.date,
          lt: new Date(
            Date.UTC(
              activity.date.getUTCFullYear(),
              activity.date.getUTCMonth(),
              activity.date.getUTCDate() + 7
            )
          ),
        },
      },
      orderBy: [{ date: 'asc' }, { schedule: 'asc' }],
      select: {
        id: true,
        date: true,
        schedule: true,
        activityGroupId: true,
        professors: {
          select: { userId: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
  ]);

  const initialAnnualSchedules =
    activity.activityType === 'ANNUAL'
      ? annualCalendarSample.map((day) => ({
          weekday: String(day.date.getUTCDay()),
          schedule: day.schedule,
          groupId: day.activityGroupId ?? '',
          professorIds: day.professors.map((professor) => professor.userId),
        }))
      : [];

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Editar actividad</h1>
      <EditActivityForm
        activity={{
          id: activity.id,
          name: activity.name,
          date: activity.date.toISOString().split('T')[0],
          endDate: activity.endDate.toISOString().split('T')[0],
          activityType: activity.activityType,
          description:
            activity.description ?? firstAnnualDay?.description ?? '',
          price: activity.price,
          capacity: activity.capacity ?? null,
          professorIds: activityProfessorAssignments.map(
            (assignment) => assignment.userId
          ),
        }}
        annualDefaults={
          firstAnnualDay
            ? {
                geoLocation: firstAnnualDay.geoLocation,
                coordinates:
                  firstAnnualDay.latitude != null &&
                  firstAnnualDay.longitude != null
                    ? {
                        latitude: firstAnnualDay.latitude,
                        longitude: firstAnnualDay.longitude,
                      }
                    : null,
                sportIcon: firstAnnualDay.sportIcon ?? '',
              }
            : undefined
        }
        initialAnnualSchedules={initialAnnualSchedules}
        professors={professors}
        initialGroups={groups}
        existingDayCount={existingDayCount}
      />
      <div className="mt-8 border-t pt-8">
        <h2 className="mb-4 text-xl font-semibold">Imagen de la actividad</h2>
        <ActivityImageUpload
          activityId={params.id}
          currentImageUrl={activity.image ?? undefined}
        />
      </div>
    </main>
  );
}
