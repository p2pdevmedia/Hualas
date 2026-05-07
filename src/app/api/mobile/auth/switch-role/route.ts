import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  getMobileAllowedRoles,
  getMobileSessionFromRequest,
  switchMobileSessionRole,
} from '@/lib/mobile-auth';

const switchRoleSchema = z.object({
  role: z.enum(['MEMBER', 'PROFESSOR']),
});

export async function POST(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = switchRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { roleAssignments: { select: { role: true } } },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowedRoles = getMobileAllowedRoles(user);
  if (!allowedRoles.includes(parsed.data.role)) {
    return NextResponse.json(
      { error: 'No tenés acceso a ese perfil' },
      { status: 403 }
    );
  }

  const ok = await switchMobileSessionRole({
    sessionId: session.id,
    appRole: parsed.data.role,
  });

  if (!ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    appRole: parsed.data.role,
    allowedRoles,
  });
}
