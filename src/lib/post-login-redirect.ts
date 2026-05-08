import type { Session } from 'next-auth';
import { isCounterRole } from '@/lib/accounting';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import { checkUserProfile } from '@/lib/participant-profile-check';
import { prisma } from '@/lib/prisma';

export async function getPostLoginRedirectUrl(session: Session | null) {
  if (!session) {
    return '/login';
  }

  if (isCounterRole(session.user.role)) {
    return '/accounting';
  }

  const userId = session.user.id;
  const accessibleChildOwnerIds = await getAccessibleChildOwnerIds(userId);

  const [participantCount, professorCount] = await Promise.all([
    prisma.activityParticipant.count({
      where: {
        OR: [
          { userId },
          { child: { userId: { in: accessibleChildOwnerIds } } },
        ],
      },
    }),
    prisma.activityProfessor.count({ where: { userId } }),
  ]);

  const hasActivities = participantCount > 0 || professorCount > 0;
  if (hasActivities) {
    return '/my-activities';
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      lastName: true,
      dni: true,
      birthDate: true,
      address: true,
      phone: true,
    },
  });

  if (user && !checkUserProfile(user).valid) {
    return '/profile?onboarding=1';
  }

  return '/';
}
