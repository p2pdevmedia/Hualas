import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import CreateActivityForm from './form';

export default async function CreateActivityPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/');
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Crear actividad</h1>
        <p className="text-sm text-slate-500">
          Diseñá una nueva propuesta y compartila con la comunidad.
        </p>
      </div>
      <CreateActivityForm />
    </div>
  );
}
