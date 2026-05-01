import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import EditActivityForm from './form';
import ActivityImageUpload from '../../activity-image-upload';

interface EditActivityPageProps {
  params: { id: string };
}

export default async function EditActivityPage({
  params,
}: EditActivityPageProps) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    redirect('/');
  }
  const activity: any = await prisma.activity.findUnique({
    where: { id: params.id },
    include: { professors: true },
  });
  if (!activity) {
    redirect('/activities');
  }

  const [professors, groups] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'PROFESSOR', isActive: true },
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
  ]);

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Editar actividad</h1>
      <EditActivityForm
        activity={{
          id: activity.id,
          name: activity.name,
          date: activity.date.toISOString().split('T')[0],
          frequency: activity.frequency,
          description: activity.description ?? '',
          price: activity.price,
          capacity: activity.capacity ?? null,
          professorIds: activity.professors.map(
            (assignment: { userId: string }) => assignment.userId
          ),
        }}
        professors={professors}
        initialGroups={groups}
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
