import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { isCounterRole } from '@/lib/accounting';
import { prisma } from '@/lib/prisma';
import { checkUserProfile } from '@/lib/participant-profile-check';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ redirectUrl: '/login' }, { status: 401 });
  }

  if (isCounterRole(session.user.role)) {
    return NextResponse.json({ redirectUrl: '/accounting' });
  }

  const userId = session.user.id;

  const [user, participantCount, professorCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        lastName: true,
        dni: true,
        birthDate: true,
        address: true,
        phone: true,
      },
    }),
    prisma.activityParticipant.count({
      where: {
        OR: [{ userId }, { child: { userId } }],
      },
    }),
    prisma.activityProfessor.count({ where: { userId } }),
  ]);

  if (user && !checkUserProfile(user).valid) {
    return NextResponse.json({ redirectUrl: '/profile?onboarding=1' });
  }

  const hasActivities = participantCount > 0 || professorCount > 0;

  return NextResponse.json({
    redirectUrl: hasActivities ? '/my-activities' : '/',
  });
}
