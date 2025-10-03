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
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/');
  }
  const activity: any = await prisma.activity.findUnique({
    where: { id: params.id },
  });
  if (!activity) {
    redirect('/activities');
  }
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">
          Editar actividad
        </h1>
        <p className="text-sm text-slate-500">
          Actualizá la información para mantener a la comunidad al tanto.
        </p>
      </div>
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
    </div>
  );
}
