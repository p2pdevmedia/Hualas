import { NextResponse } from 'next/server';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';

export async function GET(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      lastName: session.user.lastName,
      role: session.user.role,
      activeRole: session.user.activeRole,
      mobileRole: session.appRole,
      isActive: session.user.isActive,
    },
    session: {
      id: session.id,
      appRole: session.appRole,
      expiresAt: session.expiresAt,
      lastUsedAt: session.lastUsedAt,
    },
  });
}
