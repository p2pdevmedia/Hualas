import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { familyGroupService } from '@/lib/services/family-group-service';
import { prisma } from '@/lib/prisma';

const addFamilyMemberSchema = z.object({
  email: z.string().email(),
  relationship: z.enum(['PARENT', 'RESPONSIBLE', 'OTHER']).default('PARENT'),
});

export async function POST(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.appRole !== 'MEMBER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const familyGroup = await familyGroupService.getFamilyGroupByResponsible(
    session.userId
  );
  if (!familyGroup) {
    return NextResponse.json(
      { error: 'No tenés un grupo familiar activo.' },
      { status: 404 }
    );
  }

  try {
    const parsed = addFamilyMemberSchema.parse(await req.json());
    const email = parsed.email.trim().toLowerCase();

    const targetUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
      return NextResponse.json(
        { error: 'No existe un usuario activo con ese email.' },
        { status: 404 }
      );
    }

    if (targetUser.id === familyGroup.responsibleUserId) {
      return NextResponse.json(
        { error: 'Ese usuario ya es el responsable principal.' },
        { status: 409 }
      );
    }

    const existingMember = await prisma.familyGroupMember.findUnique({
      where: {
        familyGroupId_memberId: {
          familyGroupId: familyGroup.id,
          memberId: targetUser.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'Ese usuario ya pertenece al grupo familiar.' },
        { status: 409 }
      );
    }

    await familyGroupService.addMemberToFamilyGroup(
      familyGroup.id,
      targetUser.id,
      parsed.relationship
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos.', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[mobile family groups] add member failed', error);
    return NextResponse.json(
      { error: 'No se pudo agregar el tutor.' },
      { status: 500 }
    );
  }
}
