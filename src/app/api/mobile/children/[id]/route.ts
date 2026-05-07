import { NextResponse } from 'next/server';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { mobileChildSelect, serializeMobileChild } from '@/lib/mobile-children';
import { prisma } from '@/lib/prisma';
import { childCreateSchema } from '@/lib/validations/child';

function parseBirthDate(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ownerIds = await getAccessibleChildOwnerIds(session.userId);
  const child = await prisma.child.findFirst({
    where: {
      id: params.id,
      userId: { in: ownerIds },
    },
    select: mobileChildSelect,
  });

  if (!child) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(serializeMobileChild(child));
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ownerIds = await getAccessibleChildOwnerIds(session.userId);
  const child = await prisma.child.findFirst({
    where: {
      id: params.id,
      userId: { in: ownerIds },
    },
    select: { id: true },
  });

  if (!child) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const data = childCreateSchema.parse(await req.json());
  const birthDate = parseBirthDate(data.birthDate);

  if (data.birthDate && !birthDate) {
    return NextResponse.json(
      { error: 'La fecha de nacimiento no es válida' },
      { status: 400 }
    );
  }

  const updated = await prisma.child.update({
    where: { id: params.id },
    data: {
      name: data.name,
      lastName: data.lastName,
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      documentFrontPhoto: data.documentFrontPhoto,
      documentBackPhoto: data.documentBackPhoto,
      birthDate,
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
    select: mobileChildSelect,
  });

  return NextResponse.json(serializeMobileChild(updated));
}
