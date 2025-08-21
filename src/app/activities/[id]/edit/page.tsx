import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import EditActivityForm from './form';

interface EditActivityPageProps {
  params: { id: string };
}

export default async function EditActivityPage({
  params,
}: EditActivityPageProps) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/');
  }
  const activity: any = await prisma.activity.findUnique({
    where: { id: params.id },
  });
  if (!activity) {
    redirect('/activities');
  }
  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Editar actividad</h1>
      <EditActivityForm
        activity={{
          id: activity.id,
          name: activity.name,
          date: activity.date.toISOString().split('T')[0],
          frequency: activity.frequency,
          image: activity.image ?? '',
          description: activity.description ?? '',
          price: activity.price,
        }}
      />
    </main>
  );
}
