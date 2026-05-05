export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { familyGroupService } from '@/lib/services/family-group-service';

const bodySchema = z.object({
  userId: z.string().min(1),
  relationship: z.enum(['PARENT', 'RESPONSIBLE', 'OTHER']).default('PARENT'),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      phone: true,
      isActive: true,
    },
  });

  if (!targetUser || !targetUser.isActive) {
    return NextResponse.json(
      { error: 'Usuario no encontrado.' },
      { status: 404 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
  }

  const { userId, relationship } = parsed.data;

  if (userId === targetUser.id) {
    return NextResponse.json(
      { error: 'No podés agregar al usuario como tutor de sí mismo.' },
      { status: 400 }
    );
  }

  const memberUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true },
  });

  if (!memberUser || !memberUser.isActive) {
    return NextResponse.json(
      { error: 'El usuario seleccionado no existe o no está activo.' },
      { status: 404 }
    );
  }

  const familyGroup =
    await familyGroupService.getOrCreateFamilyGroupByResponsible(targetUser);

  const existing = await prisma.familyGroupMember.findUnique({
    where: {
      familyGroupId_memberId: {
        familyGroupId: familyGroup.id,
        memberId: userId,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'Ese usuario ya es integrante del grupo familiar.' },
      { status: 409 }
    );
  }

  const member = await familyGroupService.addMemberToFamilyGroup(
    familyGroup.id,
    userId,
    relationship
  );

  return NextResponse.json(member, { status: 201 });
}
