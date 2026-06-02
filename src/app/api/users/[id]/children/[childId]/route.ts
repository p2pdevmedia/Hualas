import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { childCreateSchema } from '@/lib/validations/child';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';

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
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUserId = (session.user as any).id;
  const isAdmin =
    session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';

  const child = await prisma.child.findFirst({
    where: isAdmin
      ? { id: params.childId, userId: params.id }
      : {
          id: params.childId,
          userId: { in: await getAccessibleChildOwnerIds(sessionUserId) },
        },
    select: { id: true, userId: true },
  });

  if (!child) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const data = childCreateSchema.parse(await req.json());

  const updated = await prisma.child.update({
    where: { id: params.childId },
    data: {
      name: data.name,
      lastName: data.lastName,
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      documentFrontPhoto: data.documentFrontPhoto,
      documentBackPhoto: data.documentBackPhoto,
      birthDate: (() => {
        if (!data.birthDate) return null;
        const d = new Date(data.birthDate);
        return isNaN(d.getTime()) ||
          d.getFullYear() > 2100 ||
          d.getFullYear() < 1900
          ? null
          : d;
      })(),
      address: data.address,
      gender: data.gender,
      nationality: data.nationality,
      maritalStatus: data.maritalStatus,
      allergies: data.allergies,
      regularMedication: data.regularMedication,
      relevantDiseases: data.relevantDiseases,
      previousInjuries: data.previousInjuries,
      physicalRestrictions: data.physicalRestrictions,
      bloodGroup: data.bloodGroup,
      primaryDoctor: data.primaryDoctor,
      doctorPhone: data.doctorPhone,
      doctorCertificate: data.doctorCertificate,
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
      allergies: true,
      regularMedication: true,
      relevantDiseases: true,
      previousInjuries: true,
      physicalRestrictions: true,
      bloodGroup: true,
      primaryDoctor: true,
      doctorPhone: true,
      observations: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; childId: string } }
) {
  const session = await ensureAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const child = await prisma.child.findFirst({
    where: {
      id: params.childId,
      userId: params.id,
    },
    select: {
      id: true,
      name: true,
      lastName: true,
    },
  });

  if (!child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.activityParticipant.deleteMany({
      where: {
        childId: params.childId,
        userId: params.id,
      },
    }),
    prisma.child.delete({
      where: {
        id: params.childId,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    child: {
      id: child.id,
      name: child.name,
      lastName: child.lastName,
    },
  });
}
