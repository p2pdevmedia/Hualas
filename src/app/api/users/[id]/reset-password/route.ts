import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { randomBytes } from 'crypto';
import { hash } from 'bcrypt';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
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

  const newPassword = randomBytes(6).toString('base64url');
  const hashed = await hash(newPassword, 12);

  await prisma.user.update({
    where: { id: params.id },
    data: { password: hashed },
  });

  return NextResponse.json({ password: newPassword });
}
