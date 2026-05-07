import { NextResponse } from 'next/server';
import { revokeMobileSessionFromRequest } from '@/lib/mobile-auth';

export async function POST(req: Request) {
  const revoked = await revokeMobileSessionFromRequest(req);
  return NextResponse.json({ ok: revoked });
}
