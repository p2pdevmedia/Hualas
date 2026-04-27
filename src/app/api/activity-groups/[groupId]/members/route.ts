import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const membershipSchema = z.object({
  participantId: z.string().min(1),
});

async function getAuthorizedParticipant(participantId: string) {
  return prisma.activityParticipant.findUnique({
    where: { id: participantId },
    select: {
      id: true,
      userId: true,
      activityId: true,
      child: {
        select: {
          userId: true,
        },
      },
    },
  });
}

async function canManageGroupMembership(
  sessionUserId: string,
  sessionRole: string,
  activityId: string
) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      professors: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!activity) {
    return false;
  }

  const isAdmin =
    sessionRole === 'ADMIN' || sessionRole === 'SUPER_ADMIN';
  return (
    isAdmin ||
    activity.professors.some((assignment) => assignment.userId === sessionUserId)
  );
}

export async function POST(
  req: Request,
  { params }: { params: { groupId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const group = await prisma.activityGroup.findUnique({
    where: { id: params.groupId },
    select: {
      id: true,
      activityId: true,
    },
  });

  if (!group) {
    return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
  }

  const canManage = await canManageGroupMembership(
    session.user.id,
    session.user.role,
    group.activityId
  );
  if (!canManage) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { participantId } = membershipSchema.parse(await req.json());
  const participant = await getAuthorizedParticipant(participantId);

  if (!participant) {
    return NextResponse.json(
      { error: 'Inscripto no encontrado' },
      { status: 404 }
    );
  }

  if (participant.activityId !== group.activityId) {
    return NextResponse.json(
      { error: 'El inscripto no pertenece a esta actividad' },
      { status: 400 }
    );
  }

  const membership = await prisma.activityGroupMember.upsert({
    where: {
      activityParticipantId: participant.id,
    },
    create: {
      activityGroupId: group.id,
      activityParticipantId: participant.id,
    },
    update: {
      activityGroupId: group.id,
    },
  });

  return NextResponse.json(membership);
}

export async function DELETE(
  req: Request,
  { params }: { params: { groupId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const group = await prisma.activityGroup.findUnique({
    where: { id: params.groupId },
    select: {
      id: true,
      activityId: true,
    },
  });

  if (!group) {
    return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
  }

  const canManage = await canManageGroupMembership(
    session.user.id,
    session.user.role,
    group.activityId
  );
  if (!canManage) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { participantId } = membershipSchema.parse(await req.json());
  const participant = await getAuthorizedParticipant(participantId);

  if (!participant) {
    return NextResponse.json(
      { error: 'Inscripto no encontrado' },
      { status: 404 }
    );
  }

  if (participant.activityId !== group.activityId) {
    return NextResponse.json(
      { error: 'El inscripto no pertenece a esta actividad' },
      { status: 400 }
    );
  }

  const currentMembership = await prisma.activityGroupMember.findUnique({
    where: {
      activityParticipantId: participant.id,
    },
    select: {
      id: true,
      activityGroupId: true,
    },
  });

  if (!currentMembership) {
    return NextResponse.json({ ok: true });
  }

  if (currentMembership.activityGroupId !== group.id) {
    return NextResponse.json(
      { error: 'El inscripto no pertenece a este grupo' },
      { status: 400 }
    );
  }

  await prisma.activityGroupMember.delete({
    where: {
      activityParticipantId: participant.id,
    },
  });

  return NextResponse.json({ ok: true });
}
