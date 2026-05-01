import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { isCounterRole } from '@/lib/accounting';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ redirectUrl: '/login' }, { status: 401 });
  }

  if (isCounterRole(session.user.role)) {
    return NextResponse.json({ redirectUrl: '/accounting' });
  }

  const userId = session.user.id;

  const [participantCount, professorCount] = await Promise.all([
    prisma.activityParticipant.count({
      where: {
        OR: [{ userId }, { child: { userId } }],
      },
    }),
    prisma.activityProfessor.count({ where: { userId } }),
  ]);

  const hasActivities = participantCount > 0 || professorCount > 0;

  return NextResponse.json({
    redirectUrl: hasActivities ? '/my-activities' : '/',
  });
}
