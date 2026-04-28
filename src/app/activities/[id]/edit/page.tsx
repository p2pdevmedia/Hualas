import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Heading, Box, Container } from '@radix-ui/themes';
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

  const professors = await prisma.user.findMany({
    where: { role: 'PROFESSOR', isActive: true },
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
    },
    orderBy: [{ name: 'asc' }, { lastName: 'asc' }],
  });
  return (
    <Container>
      <main className="p-4">
        <Heading size="8" mb="4">
          Editar actividad
        </Heading>
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
        />
        <Box className="mt-8 border-t pt-8">
          <Heading size="6" mb="4">
            Imagen de la actividad
          </Heading>
          <ActivityImageUpload
            activityId={params.id}
            currentImageUrl={activity.image ?? undefined}
          />
        </Box>
      </main>
    </Container>
  );
}
