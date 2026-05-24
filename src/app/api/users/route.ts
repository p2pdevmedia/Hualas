import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { hash } from 'bcrypt';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/validations/auth';
import { hasAnyCapability } from '@/lib/roles';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const activeRole = session.user.activeRole ?? session.user.role;
  const canListUsers =
    hasAnyCapability(session, ['COUNTER', 'ADMIN', 'SUPER_ADMIN']) ||
    activeRole === 'COUNTER' ||
    activeRole === 'ADMIN' ||
    activeRole === 'SUPER_ADMIN';
  if (!canListUsers) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      dni: true,
      role: true,
      profilePhoto: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = registerSchema.parse(await req.json());
  const email = data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'User already exists' }, { status: 400 });
  }

  const hashed = await hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name: data.name,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  return NextResponse.json(user);
}
