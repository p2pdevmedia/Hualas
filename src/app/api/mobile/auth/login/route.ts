import { compare } from 'bcrypt';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createMobileSession, getMobileAllowedRoles } from '@/lib/mobile-auth';
import { loginSchema } from '@/lib/validations/auth';

const mobileLoginSchema = loginSchema.extend({
  role: z.enum(['MEMBER', 'PROFESSOR']).optional(),
  platform: z.string().max(32).optional().nullable(),
  deviceName: z.string().max(120).optional().nullable(),
  deviceModel: z.string().max(120).optional().nullable(),
  appVersion: z.string().max(60).optional().nullable(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = mobileLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: {
      roleAssignments: { select: { role: true } },
    },
  });

  if (!user || !user.password || !user.isActive) {
    return NextResponse.json(
      { error: 'Credenciales inválidas' },
      { status: 401 }
    );
  }

  const passwordMatches = await compare(parsed.data.password, user.password);
  if (!passwordMatches) {
    return NextResponse.json(
      { error: 'Credenciales inválidas' },
      { status: 401 }
    );
  }

  const allowedRoles = getMobileAllowedRoles(user);
  const role =
    user.activeRole === 'PROFESSOR' && allowedRoles.includes('PROFESSOR')
      ? 'PROFESSOR'
      : 'MEMBER';

  const { token, session } = await createMobileSession({
    userId: user.id,
    appRole: role,
    platform: parsed.data.platform,
    deviceName: parsed.data.deviceName,
    deviceModel: parsed.data.deviceModel,
    appVersion: parsed.data.appVersion,
  });

  const now = new Date();
  await Promise.all([
    prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: now },
    }),
    prisma.dbAuditLog.create({
      data: {
        model: 'User',
        action: 'mobile_login',
        recordId: user.id,
        userId: user.id,
        after: {
          email: user.email,
          appRole: role,
          platform: parsed.data.platform ?? null,
        },
      },
    }),
  ]);

  return NextResponse.json({
    token,
    session: {
      id: session.id,
      appRole: session.appRole,
      expiresAt: session.expiresAt,
    },
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      lastName: user.lastName,
      role: user.role,
      activeRole: user.activeRole,
      allowedRoles,
    },
  });
}
