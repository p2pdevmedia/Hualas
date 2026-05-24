import { NextResponse } from 'next/server';
import { formatFullName, formatMobileDateOnly } from '@/lib/mobile-format';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { groupId: string } }
) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.appRole !== 'PROFESSOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const group = await prisma.activityGroup.findFirst({
    where: {
      id: params.groupId,
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
      activity: {
        select: {
          id: true,
          name: true,
          description: true,
          date: true,
          endDate: true,
        },
      },
      members: {
        select: {
          id: true,
          activityParticipant: {
            select: {
              id: true,
              userId: true,
              childId: true,
              child: {
                select: {
                  id: true,
                  name: true,
                  lastName: true,
                },
              },
              user: {
                select: {
                  id: true,
                  name: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
  }

  return NextResponse.json({
    group: {
      id: group.id,
      name: group.name,
      description: group.description,
      capacity: group.capacity,
      minAge: group.minAge,
      maxAge: group.maxAge,
      createdAt: formatMobileDateOnly(group.createdAt),
      activity: group.activity,
      memberCount: group.members.length,
    },
    members: group.members.map((member) => {
      const participant = member.activityParticipant;
      const contactUser = participant.user;
      const child = participant.child;

      return {
        id: participant.id,
        userId: participant.userId,
        childId: participant.childId,
        label: child ? formatFullName(child) : formatFullName(contactUser),
        childLabel: child ? formatFullName(child) : null,
        contact: {
          name: formatFullName(contactUser),
          email: contactUser.email,
          phone: contactUser.phone,
        },
      };
    }),
  });
}
