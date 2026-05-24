import { NextResponse } from 'next/server';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { formatFullName, formatMobileDateOnly } from '@/lib/mobile-format';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.appRole !== 'PROFESSOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const groups = await prisma.activityGroup.findMany({
    where: {
      professors: { some: { userId: session.userId } },
    },
    select: {
      id: true,
      name: true,
      description: true,
      capacity: true,
      minAge: true,
      maxAge: true,
      createdAt: true,
      activity: { select: { id: true, name: true } },
      members: {
        select: {
          id: true,
          activityParticipant: {
            select: {
              id: true,
              userId: true,
              child: { select: { id: true, name: true, lastName: true } },
              user: { select: { id: true, name: true, lastName: true } },
            },
          },
        },
      },
    },
    orderBy: [{ activity: { name: 'asc' } }, { name: 'asc' }],
  });

  return NextResponse.json({
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      capacity: group.capacity,
      minAge: group.minAge,
      maxAge: group.maxAge,
      createdAt: formatMobileDateOnly(group.createdAt),
      activity: group.activity,
      memberCount: group.members.length,
      members: group.members.map((member) => ({
        id: member.activityParticipant.id,
        userId: member.activityParticipant.userId,
        label: member.activityParticipant.child
          ? formatFullName(member.activityParticipant.child)
          : formatFullName(member.activityParticipant.user),
      })),
    })),
  });
}
