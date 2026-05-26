import { randomBytes, createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const RESET_TOKEN_TTL_MINUTES = 30;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return NextResponse.json(
      { error: 'Ingresá un email válido.' },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isActive: true },
  });

  let resetUrl: string | undefined;

  if (user?.isActive) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000
    );

    await prisma.passwordResetToken.create({
      data: {
        token: hashToken(token),
        userId: user.id,
        expiresAt,
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      resetUrl = `${new URL(request.url).origin}/reset-password?token=${token}`;
    }
  }

  return NextResponse.json({
    ok: true,
    resetUrl,
    message:
      'Si el email corresponde a una cuenta activa, se generó una solicitud de recuperación.',
  });
}
