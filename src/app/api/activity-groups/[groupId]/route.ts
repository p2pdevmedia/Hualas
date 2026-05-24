import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activityGroupCreateSchema } from '@/lib/validations/activity';

export async function DELETE(
  _req: Request,
  { params }: { params: { groupId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin =
    session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const group = await prisma.activityGroup.findUnique({
    where: { id: params.groupId },
  });

  if (!group) {
    return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
  }

  await prisma.activityGroup.delete({ where: { id: params.groupId } });

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: { groupId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin =
    session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const group = await prisma.activityGroup.findUnique({
    where: { id: params.groupId },
  });

  if (!group) {
    return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = activityGroupCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 }
    );
  }

  const professorIds = Array.from(new Set(parsed.data.professorIds));
  if (professorIds.length === 0) {
    return NextResponse.json(
      { error: 'Selecciona al menos un profesor para el grupo' },
      { status: 400 }
    );
  }
  const validProfessors = await prisma.user.findMany({
    where: {
      id: { in: professorIds },
      roleAssignments: { some: { role: 'PROFESSOR' } },
      isActive: true,
    },
    select: { id: true },
  });

  if (validProfessors.length !== professorIds.length) {
    return NextResponse.json(
      { error: 'Uno o mas profesores no son validos' },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const group = await tx.activityGroup.update({
      where: { id: params.groupId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        capacity: parsed.data.capacity,
        minAge: parsed.data.minAge,
        maxAge: parsed.data.maxAge,
      },
    });

    await tx.activityGroupProfessor.deleteMany({
      where: { activityGroupId: params.groupId },
    });
    await tx.activityGroupProfessor.createMany({
      data: professorIds.map((userId) => ({
        activityGroupId: params.groupId,
        userId,
      })),
    });

    return group;
  });

  return NextResponse.json(updated);
}
