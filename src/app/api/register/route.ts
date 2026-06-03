import { NextResponse } from 'next/server';
import { hash } from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/validations/auth';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

export async function POST(req: Request) {
  const rate = checkRateLimit(`register:${getClientIp(req)}`, {
    limit: 5,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Probá de nuevo en unos segundos.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rate.retryAfterSeconds) },
      }
    );
  }

  const data = await req.json();
  const { email: rawEmail, password, name } = registerSchema.parse(data);
  const email = rawEmail.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'User already exists' }, { status: 400 });
  }
  const hashed = await hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashed, name },
  });
  return NextResponse.json({ id: user.id, email: user.email });
}
