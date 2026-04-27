import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import CreateActivityForm from './form';

export default async function CreateActivityPage() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    redirect('/');
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
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Crear actividad</h1>
      <CreateActivityForm professors={professors} />
    </main>
  );
}
