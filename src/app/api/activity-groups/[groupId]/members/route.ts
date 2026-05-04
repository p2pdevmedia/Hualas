import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const membershipSchema = z.object({
  participantId: z.string().min(1),
});

function getAgeFromBirthDate(birthDate: Date | null) {
  if (!birthDate) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

async function getAuthorizedParticipant(participantId: string) {
  return prisma.activityParticipant.findUnique({
    where: { id: participantId },
    select: {
      id: true,
      userId: true,
      activityId: true,
      user: {
        select: {
          birthDate: true,
        },
      },
      child: {
        select: {
          userId: true,
          birthDate: true,
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

  const isAdmin = sessionRole === 'ADMIN' || sessionRole === 'SUPER_ADMIN';
  return (
    isAdmin ||
    activity.professors.some(
      (assignment) => assignment.userId === sessionUserId
    )
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
      capacity: true,
      minAge: true,
      maxAge: true,
      _count: {
        select: {
          members: true,
        },
      },
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
      activityGroupId: true,
    },
  });

  if (
    currentMembership?.activityGroupId !== group.id &&
    group.capacity != null &&
    group._count.members >= group.capacity
  ) {
    return NextResponse.json(
      { error: 'El grupo ya alcanzó su cupo' },
      { status: 400 }
    );
  }

  const age = getAgeFromBirthDate(
    participant.child ? participant.child.birthDate : participant.user.birthDate
  );

  if (age == null) {
    return NextResponse.json(
      { error: 'El inscripto no tiene fecha de nacimiento cargada' },
      { status: 400 }
    );
  }

  if (group.minAge != null && age < group.minAge) {
    return NextResponse.json(
      {
        error: `El inscripto no alcanza la edad mínima del grupo (${group.minAge})`,
      },
      { status: 400 }
    );
  }

  if (group.maxAge != null && age > group.maxAge) {
    return NextResponse.json(
      {
        error: `El inscripto supera la edad máxima del grupo (${group.maxAge})`,
      },
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
