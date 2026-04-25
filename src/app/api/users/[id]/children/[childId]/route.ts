import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { childCreateSchema } from '@/lib/validations/child';

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return null;
  }
  return session;
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string; childId: string } }
) {
  const session = await ensureAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = childCreateSchema.parse(await req.json());

  const child = await prisma.child.updateMany({
    where: {
      id: params.childId,
      userId: params.id,
    },
    data: {
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
  });

  if (child.count === 0) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  const updatedChild = await prisma.child.findFirst({
    where: {
      id: params.childId,
      userId: params.id,
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

  return NextResponse.json(updatedChild);
}
