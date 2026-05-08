import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getActiveRole, hasAdminCapability } from '@/lib/roles';

const reportSchema = z.object({
  activityParticipantId: z.string().min(1),
  body: z.string().trim().min(1, 'El reporte no puede estar vacío').max(5000),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string; dayId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const activeRole = getActiveRole(session);
  const isAdmin = activeRole === 'ADMIN' && hasAdminCapability(session);
  const isProfessor = activeRole === 'PROFESSOR';
  if (!isAdmin && !isProfessor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = reportSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const day = await prisma.activityDay.findFirst({
    where: { id: params.dayId, activityId: params.id },
    select: {
      id: true,
      activityGroupId: true,
      professors: { select: { userId: true } },
    },
  });

  if (!day) {
    return NextResponse.json(
      { error: 'Día de actividad no encontrado' },
      { status: 404 }
    );
  }

  if (
    isProfessor &&
    !day.professors.some((professor) => professor.userId === session.user.id)
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const participant = await prisma.activityParticipant.findFirst({
    where: {
      id: data.activityParticipantId,
      activityId: params.id,
    },
    select: {
      id: true,
      groupMembership: { select: { activityGroupId: true } },
    },
  });

  if (!participant) {
    return NextResponse.json(
      { error: 'Participante no encontrado' },
      { status: 404 }
    );
  }

  if (
    day.activityGroupId &&
    participant.groupMembership?.activityGroupId !== day.activityGroupId
  ) {
    return NextResponse.json(
      { error: 'El participante no pertenece al grupo de este día' },
      { status: 400 }
    );
  }

  const report = await prisma.activityParticipantReport.upsert({
    where: {
      activityDayId_activityParticipantId: {
        activityDayId: day.id,
        activityParticipantId: participant.id,
      },
    },
    create: {
      activityDayId: day.id,
      activityParticipantId: participant.id,
      createdById: session.user.id,
      body: data.body,
    },
    update: {
      body: data.body,
      createdById: session.user.id,
    },
    select: {
      id: true,
      body: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(report);
}
