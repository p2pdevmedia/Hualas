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

  const [rawUsers, familyGroups, allChildren] = await Promise.all([
    prisma.user.findMany({
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
    }),
    prisma.familyGroup.findMany({
      select: {
        responsibleUserId: true,
        members: { select: { memberId: true } },
      },
    }),
    prisma.child.findMany({
      select: { id: true, name: true, lastName: true, birthDate: true, userId: true },
    }),
  ]);

  // Build owner → children map
  const childrenByOwner = new Map<string, typeof allChildren>();
  for (const child of allChildren) {
    const list = childrenByOwner.get(child.userId) ?? [];
    list.push(child);
    childrenByOwner.set(child.userId, list);
  }

  // Build member → responsible map (tutors see responsible's children)
  const responsibleByMember = new Map<string, string>();
  for (const group of familyGroups) {
    if (!group.responsibleUserId) continue;
    for (const member of group.members) {
      responsibleByMember.set(member.memberId, group.responsibleUserId);
    }
  }

  const users = rawUsers.map((u) => {
    const direct = childrenByOwner.get(u.id) ?? [];
    const responsibleId = responsibleByMember.get(u.id);
    const familyChildren = responsibleId ? (childrenByOwner.get(responsibleId) ?? []) : [];
    const seen = new Set(direct.map((c) => c.id));
    const children = [...direct, ...familyChildren.filter((c) => !seen.has(c.id))];
    return { ...u, roles: u.roleAssignments.map((r) => r.role), children };
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
          users={users}
          canManageRoles={canManageRoles}
          canManageSuperAdmin={canManageSuperAdmin}
        />
      </div>
    </div>
  );
}
