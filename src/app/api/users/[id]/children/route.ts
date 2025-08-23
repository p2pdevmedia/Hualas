import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { childCreateSchema } from '@/lib/validations/child';

export async function GET(
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
  const children = await prisma.child.findMany({
    where: { userId: params.id },
    select: { id: true, name: true, birthDate: true },
  });
  return NextResponse.json(children);
}

export async function POST(
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
  const data = childCreateSchema.parse(await req.json());
  const child = await prisma.child.create({
    data: {
      userId: params.id,
      name: data.name,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
    },
    select: { id: true, name: true, birthDate: true },
  });
  return NextResponse.json(child);
}
