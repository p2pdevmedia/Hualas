import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Role } from '@prisma/client';
import { SWITCHABLE_PROFILES } from '@/lib/roles';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const requested = (body as { role?: string } | null)?.role as
    | Role
    | undefined;
  if (!requested || !SWITCHABLE_PROFILES.includes(requested)) {
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
  }

  // MEMBER is always available (implicit). Other targets require an assignment.
  if (requested !== 'MEMBER') {
    const assignment = await prisma.userRoleAssignment.findUnique({
      where: { userId_role: { userId: session.user.id, role: requested } },
      select: { id: true },
    });
    if (!assignment) {
      return NextResponse.json({ error: 'role_not_assigned' }, { status: 403 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { activeRole: requested },
    select: { activeRole: true },
  });

  return NextResponse.json({ activeRole: updated.activeRole });
}
