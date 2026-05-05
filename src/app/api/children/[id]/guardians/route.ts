import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { ChildGuardianRelationship } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const guardianSchema = z.object({
  email: z.string().email(),
  relationship: z.nativeEnum(ChildGuardianRelationship),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUserId = (session.user as { id: string }).id;
  const child = await prisma.child.findFirst({
    where: { id: params.id, userId: currentUserId },
    select: { id: true, userId: true, name: true, lastName: true },
  });

  if (!child) {
    return NextResponse.json(
      { error: 'Solo el responsable principal puede agregar adultos.' },
      { status: 403 }
    );
  }

  const parsed = guardianSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos.', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const email = data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      lastName: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    return NextResponse.json(
      { error: 'No existe un usuario activo con ese email.' },
      { status: 404 }
    );
  }

  if (user.id === child.userId) {
    return NextResponse.json(
      { error: 'Ese usuario ya es responsable principal.' },
      { status: 409 }
    );
  }

  const guardian = await prisma.childGuardian.upsert({
    where: {
      childId_userId: {
        childId: child.id,
        userId: user.id,
      },
    },
    update: { relationship: data.relationship },
    create: {
      childId: child.id,
      userId: user.id,
      relationship: data.relationship,
    },
    include: {
      user: { select: { id: true, email: true, name: true, lastName: true } },
    },
  });

  return NextResponse.json(guardian);
}
