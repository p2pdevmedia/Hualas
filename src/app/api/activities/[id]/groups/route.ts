import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activityGroupCreateSchema } from '@/lib/validations/activity';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const activity = await prisma.activity.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      professors: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!activity) {
    return NextResponse.json(
      { error: 'Actividad no encontrada' },
      { status: 404 }
    );
  }

  const isAdmin =
    session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
  const isAssignedProfessor = activity.professors.some(
    (assignment) => assignment.userId === session.user.id
  );

  if (!isAdmin && !isAssignedProfessor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = activityGroupCreateSchema.parse(await req.json());
  const professorIds = Array.from(new Set(data.professorIds));
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

  const group = await prisma.activityGroup.create({
    data: {
      activityId: activity.id,
      name: data.name,
      description: data.description || null,
      capacity: data.capacity,
      minAge: data.minAge,
      maxAge: data.maxAge,
    },
  });
  await prisma.activityGroupProfessor.createMany({
    data: professorIds.map((userId: string) => ({
      activityGroupId: group.id,
      userId,
    })),
  });

  return NextResponse.json(group);
}
