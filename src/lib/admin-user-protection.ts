import type { Session } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { hasSuperAdminCapability } from '@/lib/roles';

export async function blocksSuperAdminTarget(
  session: Session | null | undefined,
  targetUserId: string
) {
  if (hasSuperAdminCapability(session)) return false;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      roleAssignments: { select: { role: true } },
    },
  });

  return Boolean(
    target?.roleAssignments.some(
      (assignment) => assignment.role === 'SUPER_ADMIN'
    )
  );
}
