import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import UsersList from './users-list';

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    redirect('/');
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      dni: true,
      role: true,
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Padres</h1>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <UsersList users={users} />
      </div>
    </div>
  );
}
