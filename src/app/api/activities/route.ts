import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activityCreateSchema } from '@/lib/validations/activity';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = activityCreateSchema.parse(await req.json());
  const professorIds = Array.from(new Set(data.professorIds ?? []));
  if (professorIds.length > 0) {
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

  const activity = await prisma.activity.create({
    data: {
      name: data.name,
      date: data.date,
      frequency: data.frequency,
      image: data.image,
      description: data.description,
      price: data.price,
      capacity: data.capacity,
      professors:
        data.professorIds === undefined
          ? undefined
          : {
              create: professorIds.map((userId) => ({
                user: { connect: { id: userId } },
              })),
            },
    },
  });
  return NextResponse.json(activity);
}
