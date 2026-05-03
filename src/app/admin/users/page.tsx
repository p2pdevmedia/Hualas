import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import UsersList from './users-list';

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  // Auth gating happens in the parent /admin layout.
  const canManageRoles =
    session?.user.role === 'ADMIN' || session?.user.role === 'SUPER_ADMIN';
  const canManageSuperAdmin =
    (session?.user as { roles?: string[] } | undefined)?.roles?.includes(
      'SUPER_ADMIN'
    ) ?? false;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      dni: true,
      role: true,
      roleAssignments: { select: { role: true } },
      profilePhoto: true,
      updatedAt: true,
    },
  });
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Alta, edición y administración de miembros.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/new">Nuevo usuario</Link>
        </Button>
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <UsersList
          users={users.map((user) => ({
            ...user,
            roles: user.roleAssignments.map((assignment) => assignment.role),
          }))}
          canManageRoles={canManageRoles}
          canManageSuperAdmin={canManageSuperAdmin}
        />
      </div>
    </div>
  );
}
