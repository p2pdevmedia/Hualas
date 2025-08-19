import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
  });

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id}>
            {u.name ?? 'Unnamed'} ({u.email}) - {u.role}
          </li>
        ))}
      </ul>
    </div>
  );
}
