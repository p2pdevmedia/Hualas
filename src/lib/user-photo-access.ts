import type { Session } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { canProfessorAccessUser } from '@/lib/professor-access';
import { hasAdminCapability } from '@/lib/roles';

export async function canViewUserProfilePhoto(
  session: Session | null | undefined,
  targetUserId: string
) {
  const viewerId = session?.user?.id;
  if (!viewerId) return false;
  if (viewerId === targetUserId) return true;
  if (hasAdminCapability(session)) return true;
  if (await canProfessorAccessUser(viewerId, targetUserId)) return true;

  const sharedFamilyGroup = await prisma.familyGroup.findFirst({
    where: {
      OR: [
        {
          responsibleUserId: viewerId,
          members: { some: { memberId: targetUserId } },
        },
        {
          responsibleUserId: targetUserId,
          members: { some: { memberId: viewerId } },
        },
        {
          members: {
            some: { memberId: viewerId },
          },
          AND: [
            {
              members: {
                some: { memberId: targetUserId },
              },
            },
          ],
        },
      ],
    },
    select: { id: true },
  });

  return Boolean(sharedFamilyGroup);
}
