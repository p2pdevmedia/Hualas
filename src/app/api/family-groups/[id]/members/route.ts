export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { familyGroupService } from '@/lib/services/family-group-service';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const schema = z
    .object({
      memberId: z.string().optional(),
      leaveSelf: z.boolean().optional(),
    })
    .refine((data) => data.leaveSelf || data.memberId, {
      message: 'Datos inválidos.',
    });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
  }

  const group = await prisma.familyGroup.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      responsibleUserId: true,
      members: {
        where: { memberId: session.user.id },
        select: { memberId: true },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isResponsible = group.responsibleUserId === session.user.id;
  const isMember = group.members.length > 0;
  const targetMemberId = parsed.data.leaveSelf
    ? session.user.id
    : parsed.data.memberId;

  if (!targetMemberId) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
  }

  if (targetMemberId === group.responsibleUserId) {
    return NextResponse.json(
      { error: 'No podés eliminar al responsable principal.' },
      { status: 400 }
    );
  }

  if (!isResponsible && !(parsed.data.leaveSelf && isMember)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await familyGroupService.removeMemberFromFamilyGroup(
    params.id,
    targetMemberId
  );

  return NextResponse.json({ ok: true });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const groups = await familyGroupService.getFamilyGroupsForUser(
    session.user.id
  );
  if (!groups.some((group) => group.id === params.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(
    await familyGroupService.getMembersForFamilyGroup(params.id)
  );
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const familyGroup = await familyGroupService.getFamilyGroupByResponsible(
    session.user.id
  );
  if (!familyGroup || familyGroup.id !== params.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const schema = z.object({
    email: z.string().email(),
    relationship: z.enum(['PARENT', 'RESPONSIBLE', 'OTHER']).default('PARENT'),
  });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos.', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { email: parsed.data.email.trim().toLowerCase() },
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

  return NextResponse.json(
    await familyGroupService.addMemberToFamilyGroup(
      params.id,
      targetUser.id,
      parsed.data.relationship
    )
  );
}
