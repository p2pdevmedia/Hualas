import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activityUpdateSchema } from '@/lib/validations/activity';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = activityUpdateSchema.parse(await req.json());
  const professorIds = Array.from(new Set(data.professorIds ?? []));
  if (data.professorIds !== undefined && professorIds.length > 0) {
    const validProfessors = await prisma.user.findMany({
      where: {
        id: { in: professorIds },
        role: 'PROFESSOR',
        isActive: true,
      },
      select: { id: true },
    });
    if (validProfessors.length !== professorIds.length) {
      return NextResponse.json(
        { error: 'Uno o más profesores no son válidos' },
        { status: 400 }
      );
    }
  }

  const activity = await prisma
    .$transaction(async (tx) => {
      const updatedActivity = await tx.activity.update({
        where: { id: params.id },
        data: {
          name: data.name,
          date: data.date,
          endDate: data.endDate,
          activityType: data.activityType,
          frequency: data.frequency,
          image: data.image ?? null,
          description: data.description ?? null,
          price: data.price,
          capacity: data.capacity ?? null,
        },
        select: { id: true },
      });

      const activityId = updatedActivity.id;

      await tx.activityProfessor.deleteMany({
        where: { activityId },
      });

      if (professorIds.length > 0) {
        await tx.activityProfessor.createMany({
          data: professorIds.map((userId) => ({
            activityId,
            userId,
          })),
        });
      }

      return { id: activityId };
    })
    .catch((error) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return null;
      }

      throw error;
    });

  if (!activity) {
    return NextResponse.json(
      { error: 'Actividad no encontrada' },
      { status: 404 }
    );
  }

  return NextResponse.json(activity);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const activity = await prisma.activity.findUnique({
    where: { id: params.id },
    include: { participants: true },
  });

  if (!activity) {
    return NextResponse.json(
      { error: 'Actividad no encontrada' },
      { status: 404 }
    );
  }

  if (activity.participants.length > 0) {
    return NextResponse.json(
      { error: 'No se puede borrar una actividad con inscritos' },
      { status: 400 }
    );
  }

  await prisma.activity.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
