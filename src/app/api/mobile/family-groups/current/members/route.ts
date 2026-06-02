export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { familyGroupService } from '@/lib/services/family-group-service';

type FamilyGroupWithMembers = {
  id: string;
  name: string;
  responsibleUserId: string | null;
  responsibleUser: {
    id: string;
    name: string | null;
    lastName: string | null;
    email: string;
  } | null;
  members: Array<{
    id: string;
    memberId: string;
    relationship: string;
    isPaymentResponsible: boolean;
    member: {
      id: string;
      name: string | null;
      lastName: string | null;
      email: string;
    };
  }>;
};

const addFamilyMemberSchema = z.object({
  email: z.string().email(),
  relationship: z.enum(['PARENT', 'RESPONSIBLE', 'OTHER']).default('PARENT'),
});

const removeFamilyMemberSchema = z.object({
  memberId: z.string().min(1),
});

export async function GET(_req: Request) {
  const session = await getMobileSessionFromRequest(_req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.appRole !== 'MEMBER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const groups = await familyGroupService.getFamilyGroupsForUser(
    session.userId
  );
  const familyGroup = (groups.find(
    (group) => group.responsibleUserId === session.userId
  ) ??
    groups[0] ??
    null) as FamilyGroupWithMembers | null;

  if (!familyGroup) {
    return NextResponse.json(
      { error: 'No tenés un grupo familiar activo.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    familyGroup: serializeFamilyGroup(familyGroup),
    isResponsible: familyGroup.responsibleUserId === session.userId,
  });
}

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

export async function DELETE(req: Request) {
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
    const parsed = removeFamilyMemberSchema.parse(await req.json());

    if (parsed.memberId === familyGroup.responsibleUserId) {
      return NextResponse.json(
        { error: 'No podés eliminar al responsable principal.' },
        { status: 400 }
      );
    }

    const existingMember = await prisma.familyGroupMember.findUnique({
      where: {
        familyGroupId_memberId: {
          familyGroupId: familyGroup.id,
          memberId: parsed.memberId,
        },
      },
    });

    if (!existingMember) {
      return NextResponse.json(
        { error: 'Ese usuario no pertenece al grupo familiar.' },
        { status: 404 }
      );
    }

    await familyGroupService.removeMemberFromFamilyGroup(
      familyGroup.id,
      parsed.memberId
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos.', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[mobile family groups] remove member failed', error);
    return NextResponse.json(
      { error: 'No se pudo eliminar el tutor.' },
      { status: 500 }
    );
  }
}

function serializeFamilyGroup(group: FamilyGroupWithMembers) {
  return {
    id: group.id,
    name: group.name,
    responsibleUserId: group.responsibleUserId,
    responsibleUser: group.responsibleUser
      ? {
          id: group.responsibleUser.id,
          name: group.responsibleUser.name,
          lastName: group.responsibleUser.lastName,
          email: group.responsibleUser.email,
        }
      : null,
    members: group.members.map((member) => ({
      id: member.id,
      memberId: member.memberId,
      name: formatDisplayName(
        member.member.name,
        member.member.lastName,
        member.member.email
      ),
      email: member.member.email,
      relationship: member.relationship,
      isPaymentResponsible: member.isPaymentResponsible,
    })),
  };
}

function formatDisplayName(
  name: string | null,
  lastName: string | null,
  email: string
) {
  return (
    [name, lastName]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(' ')
      .trim() || email
  );
}
