import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import EditUserForm from './form';

export default async function EditUserPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/');
  }
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) {
    redirect('/admin/users');
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Edit User</h1>
      <EditUserForm user={user} />
    </div>
  );
}
