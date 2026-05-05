import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { childCreateSchema } from '@/lib/validations/child';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const child = await prisma.child.findFirst({
    where: { id: params.id, userId },
    select: { id: true, name: true, lastName: true },
  });

  if (!child) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const inscriptions = await prisma.activityParticipant.count({
    where: { childId: params.id },
  });

  if (inscriptions > 0) {
    return NextResponse.json(
      { error: 'El menor tiene inscripciones y no puede ser eliminado' },
      { status: 409 }
    );
  }

  await prisma.child.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ownerIds = await getAccessibleChildOwnerIds((session.user as any).id);
  const child = await prisma.child.findFirst({
    where: { id: params.id, userId: { in: ownerIds } },
    select: { userId: true },
  });

  if (!child) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const data = childCreateSchema.parse(await req.json());

  const updated = await prisma.child.update({
    where: { id: params.id },
    data: {
      name: data.name,
      lastName: data.lastName,
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      documentFrontPhoto: data.documentFrontPhoto,
      documentBackPhoto: data.documentBackPhoto,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
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
      documentFrontPhoto: true,
      documentBackPhoto: true,
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
      doctorCertificate: true,
      observations: true,
    },
  });

  return NextResponse.json(updated);
}
