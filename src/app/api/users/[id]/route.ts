import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { userUpdateSchema } from '@/lib/validations/user';
import { hasSuperAdminCapability } from '@/lib/roles';
import type { Role } from '@prisma/client';

export async function PATCH(
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

  const data = userUpdateSchema.parse(await req.json());
  // Only SUPER_ADMIN capability can change role assignments (matches the
  // pre-multi-role behavior — single-role edits were SUPER_ADMIN-only).
  if ((data.role || data.roles) && !hasSuperAdminCapability(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (data.email) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing && existing.id !== params.id) {
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
    if (existingDni && existingDni.id !== params.id) {
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
  if (data.birthDate !== undefined)
    updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null;
  if (data.gender !== undefined) updateData.gender = data.gender;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.nationality !== undefined) updateData.nationality = data.nationality;
  if (data.maritalStatus !== undefined)
    updateData.maritalStatus = data.maritalStatus;
  if (data.observations !== undefined)
    updateData.observations = data.observations;
  if (data.allergies !== undefined) updateData.allergies = data.allergies;
  if (data.regularMedication !== undefined)
    updateData.regularMedication = data.regularMedication;
  if (data.relevantDiseases !== undefined)
    updateData.relevantDiseases = data.relevantDiseases;
  if (data.previousInjuries !== undefined)
    updateData.previousInjuries = data.previousInjuries;
  if (data.physicalRestrictions !== undefined)
    updateData.physicalRestrictions = data.physicalRestrictions;
  if (data.bloodGroup !== undefined) updateData.bloodGroup = data.bloodGroup;
  if (data.primaryDoctor !== undefined)
    updateData.primaryDoctor = data.primaryDoctor;
  if (data.doctorPhone !== undefined) updateData.doctorPhone = data.doctorPhone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  // Sync role assignments when `roles` is provided. We mirror the chosen
  // capabilities into the legacy `role` column for backward compatibility
  // (used until Phase F drops it).
  let nextRoles: Role[] | null = null;
  if (data.roles !== undefined) {
    nextRoles = Array.from(new Set(data.roles)) as Role[];
  } else if (data.role !== undefined) {
    nextRoles = data.role === 'MEMBER' ? [] : [data.role as Role];
  }

  if (nextRoles !== null) {
    const legacyRole: Role = nextRoles.length === 0 ? 'MEMBER' : nextRoles[0];
    updateData.role = legacyRole;
    // If the user's activeRole would no longer be valid, snap it back to MEMBER.
    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { activeRole: true },
    });
    if (target && target.activeRole !== 'MEMBER' && !nextRoles.includes(target.activeRole)) {
      updateData.activeRole = 'MEMBER';
    }
  }

  const user = await prisma.$transaction(async (tx) => {
    if (nextRoles !== null) {
      await tx.userRoleAssignment.deleteMany({
        where: { userId: params.id, role: { notIn: nextRoles as Role[] } },
      });
      for (const role of nextRoles) {
        await tx.userRoleAssignment.upsert({
          where: { userId_role: { userId: params.id, role } },
          create: {
            userId: params.id,
            role,
            assignedById: session.user.id,
          },
          update: {},
        });
      }
    }
    return tx.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        role: true,
        activeRole: true,
        dni: true,
        birthDate: true,
        gender: true,
        address: true,
        phone: true,
        nationality: true,
        maritalStatus: true,
        observations: true,
        isActive: true,
        roleAssignments: { select: { role: true } },
      },
    });
  });

  return NextResponse.json(user);
}

export async function DELETE(
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

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
