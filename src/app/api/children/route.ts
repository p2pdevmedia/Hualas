import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { childCreateSchema } from '@/lib/validations/child';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const children = await prisma.child.findMany({
    where: { userId: (session.user as any).id },
    select: { id: true, name: true, birthDate: true },
  });
  return NextResponse.json(children);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = childCreateSchema.parse(await req.json());
  const child = await prisma.child.create({
    data: {
      userId: (session.user as any).id,
      name: data.name,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
    },
    select: { id: true, name: true, birthDate: true },
  });
  return NextResponse.json(child);
}
