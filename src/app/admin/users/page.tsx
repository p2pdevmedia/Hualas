import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DeleteUserButton from './delete-button';

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    redirect('/');
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, lastName: true, email: true, role: true },
  });

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id} className="flex items-center gap-2">
            <span className="flex-1">
              {u.name} {u.lastName} ({u.email}) - {u.role}
            </span>
            <Link
              href={`/admin/users/${u.id}/view`}
              className="text-blue-600 hover:underline"
            >
              View
            </Link>
            <Link
              href={`/admin/users/${u.id}`}
              className="text-blue-600 hover:underline"
            >
              Edit
            </Link>
            <DeleteUserButton id={u.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
