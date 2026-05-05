import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { familyGroupService } from '@/lib/services/family-group-service';
import AddTutorAdminForm from './add-tutor-admin-form';

export default async function AdminAddTutorPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    redirect('/admin/users');
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, lastName: true, email: true },
  });

  if (!targetUser) redirect('/admin/users');

  const familyGroup = await familyGroupService.getFamilyGroupByResponsible(
    params.id
  );
  const existingMemberIds = new Set(
    familyGroup?.members.map((m) => m.member.id) ?? []
  );
  existingMemberIds.add(params.id);

  const allActiveUsers = await prisma.user.findMany({
    where: { isActive: true, id: { notIn: Array.from(existingMemberIds) } },
    select: { id: true, name: true, lastName: true, email: true },
    orderBy: [{ lastName: 'asc' }, { name: 'asc' }],
  });

  const displayName =
    [targetUser.name, targetUser.lastName].filter(Boolean).join(' ') ||
    targetUser.email;

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/users/${params.id}/view`}
          prefetch={true}
          className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted transition-colors"
        >
          ← Volver
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agregar tutor</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{displayName}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground mb-6">
          Seleccioná un usuario activo del sistema para sumarlo como tutor o
          integrante del grupo familiar de{' '}
          <span className="font-medium text-foreground">{displayName}</span>.
        </p>
        <AddTutorAdminForm
          targetUserId={params.id}
          activeUsers={allActiveUsers}
        />
      </div>
    </div>
  );
}
