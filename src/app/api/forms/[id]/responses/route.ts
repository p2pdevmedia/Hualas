import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formResponseSchema } from '@/lib/validations/form';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data } = formResponseSchema.parse(await req.json());
  const response = await prisma.formResponse.create({
    data: {
      formId: params.id,
      userId: session.user.id,
      data,
    },
  });
  return NextResponse.json(response);
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const responses = await prisma.formResponse.findMany({
    where: { formId: params.id },
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(responses);
}
