import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { hash } from 'bcrypt';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { profileUpdateSchema } from '@/lib/validations/profile';

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = profileUpdateSchema.parse(await req.json());

  if (data.email) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing && existing.id !== session.user.id) {
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
    if (existingDni && existingDni.id !== session.user.id) {
      return NextResponse.json(
        { error: 'DNI already in use' },
        { status: 400 }
      );
    }
  }

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.dni !== undefined) updateData.dni = data.dni;
  if (data.birthDate !== undefined)
    updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null;
  if (data.gender !== undefined) updateData.gender = data.gender;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.nationality !== undefined) updateData.nationality = data.nationality;
  if (data.maritalStatus !== undefined)
    updateData.maritalStatus = data.maritalStatus;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.password !== undefined) {
    updateData.password = await hash(data.password, 12);
  }

  const user = await prisma.user.update({
    where: { id: (session.user as any).id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      lastName: true,
      dni: true,
      birthDate: true,
      gender: true,
      address: true,
      nationality: true,
      maritalStatus: true,
    },
  });

  return NextResponse.json(user);
}
