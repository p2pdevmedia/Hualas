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
    select: {
      id: true,
      name: true,
      lastName: true,
      documentType: true,
      documentNumber: true,
      birthDate: true,
      address: true,
      gender: true,
      nationality: true,
      maritalStatus: true,
      observations: true,
    },
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
      lastName: data.lastName,
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      address: data.address,
      gender: data.gender,
      nationality: data.nationality,
      maritalStatus: data.maritalStatus,
      observations: data.observations,
    },
    select: {
      id: true,
      name: true,
      lastName: true,
      documentType: true,
      documentNumber: true,
      birthDate: true,
      address: true,
      gender: true,
      nationality: true,
      maritalStatus: true,
      observations: true,
    },
  });
  return NextResponse.json(child);
}
