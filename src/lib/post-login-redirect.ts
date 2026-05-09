import type { Session } from 'next-auth';
import { isCounterRole } from '@/lib/accounting';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import { checkUserProfile } from '@/lib/participant-profile-check';
import { prisma } from '@/lib/prisma';

export async function shouldUseMyActivitiesAsHome(session: Session | null) {
  if (!session) {
    return false;
  }

  if (session.user.role === 'PROFESSOR') {
    return true;
  }

  if (session.user.role !== 'MEMBER') {
    return false;
  }

  const userId = session.user.id;
  const accessibleChildOwnerIds = await getAccessibleChildOwnerIds(userId);
  const participantCount = await prisma.activityParticipant.count({
    where: {
      OR: [{ userId }, { child: { userId: { in: accessibleChildOwnerIds } } }],
    },
  });

  return participantCount > 0;
}

export async function getPostLoginRedirectUrl(session: Session | null) {
  if (!session) {
    return '/login';
  }

  if (isCounterRole(session.user.role)) {
    return '/accounting';
  }

  if (await shouldUseMyActivitiesAsHome(session)) {
    return '/my-activities';
  }

  const userId = session.user.id;
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
