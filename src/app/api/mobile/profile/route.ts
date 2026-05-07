import { hash } from 'bcrypt';
import { NextResponse } from 'next/server';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { formatMobileDateOnly } from '@/lib/mobile-format';
import { prisma } from '@/lib/prisma';
import { profileUpdateSchema } from '@/lib/validations/profile';

function serializeProfileUser(user: {
  id: string;
  email: string;
  name: string | null;
  lastName: string | null;
  profilePhoto: string | null;
  dni: string | null;
  birthDate: Date | null;
  gender: string | null;
  address: string | null;
  phone: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  allergies: string | null;
  regularMedication: string | null;
  relevantDiseases: string | null;
  previousInjuries: string | null;
  physicalRestrictions: string | null;
  bloodGroup: string | null;
  primaryDoctor: string | null;
  doctorPhone: string | null;
  doctorCertificate: string | null;
  socialFeeActive: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    lastName: user.lastName,
    profilePhoto: user.profilePhoto,
    dni: user.dni,
    birthDate: formatMobileDateOnly(user.birthDate),
    gender: user.gender,
    address: user.address,
    phone: user.phone,
    nationality: user.nationality,
    maritalStatus: user.maritalStatus,
    allergies: user.allergies,
    regularMedication: user.regularMedication,
    relevantDiseases: user.relevantDiseases,
    previousInjuries: user.previousInjuries,
    physicalRestrictions: user.physicalRestrictions,
    bloodGroup: user.bloodGroup,
    primaryDoctor: user.primaryDoctor,
    doctorPhone: user.doctorPhone,
    doctorCertificate: user.doctorCertificate,
    socialFeeActive: user.socialFeeActive,
  };
}

export async function GET(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      lastName: true,
      profilePhoto: true,
      dni: true,
      birthDate: true,
      gender: true,
      address: true,
      phone: true,
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
      socialFeeActive: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ user: serializeProfileUser(user) });
}

export async function PATCH(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if (data.email) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing && existing.id !== session.userId) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      );
    }
  }

  if (data.dni) {
    const existingDni = await prisma.user.findUnique({
      where: { dni: data.dni },
    });
    if (existingDni && existingDni.id !== session.userId) {
      return NextResponse.json(
        { error: 'DNI already in use' },
        { status: 400 }
      );
    }
  }

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.dni !== undefined) updateData.dni = data.dni ?? null;
  if (data.birthDate !== undefined) {
    if (data.birthDate) {
      const birthDate = new Date(data.birthDate);
      if (Number.isNaN(birthDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid birth date' },
          { status: 400 }
        );
      }
      updateData.birthDate = birthDate;
    } else {
      updateData.birthDate = null;
    }
  }
  if (data.gender !== undefined) updateData.gender = data.gender;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.nationality !== undefined) updateData.nationality = data.nationality;
  if (data.maritalStatus !== undefined) {
    updateData.maritalStatus = data.maritalStatus;
  }
  if (data.allergies !== undefined) updateData.allergies = data.allergies;
  if (data.regularMedication !== undefined) {
    updateData.regularMedication = data.regularMedication;
  }
  if (data.relevantDiseases !== undefined) {
    updateData.relevantDiseases = data.relevantDiseases;
  }
  if (data.previousInjuries !== undefined) {
    updateData.previousInjuries = data.previousInjuries;
  }
  if (data.physicalRestrictions !== undefined) {
    updateData.physicalRestrictions = data.physicalRestrictions;
  }
  if (data.bloodGroup !== undefined) updateData.bloodGroup = data.bloodGroup;
  if (data.primaryDoctor !== undefined) {
    updateData.primaryDoctor = data.primaryDoctor;
  }
  if (data.doctorPhone !== undefined) updateData.doctorPhone = data.doctorPhone;
  if (data.doctorCertificate !== undefined) {
    updateData.doctorCertificate = data.doctorCertificate;
  }
  if (data.socialFeeActive !== undefined) {
    updateData.socialFeeActive = data.socialFeeActive;
  }
  if (data.email !== undefined) updateData.email = data.email;
  if (data.password !== undefined) {
    updateData.password = await hash(data.password, 12);
  }

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      lastName: true,
      profilePhoto: true,
      dni: true,
      birthDate: true,
      gender: true,
      address: true,
      phone: true,
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
      socialFeeActive: true,
    },
  });

  return NextResponse.json({ user: serializeProfileUser(user) });
}
