import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';

const deviceSchema = z.object({
  token: z.string().min(20),
  platform: z.string().max(32).optional().default('iOS'),
  bundleId: z.string().max(200).optional().nullable(),
  environment: z.string().max(40).optional().nullable(),
  deviceName: z.string().max(120).optional().nullable(),
  deviceModel: z.string().max(120).optional().nullable(),
  appVersion: z.string().max(60).optional().nullable(),
});

export async function POST(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = deviceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const token = parsed.data.token.trim();
  const device = await prisma.mobileDeviceToken.upsert({
    where: { token },
    create: {
      userId: session.userId,
      token,
      platform: parsed.data.platform ?? 'iOS',
      bundleId: parsed.data.bundleId?.trim() || null,
      environment: parsed.data.environment?.trim() || null,
      deviceName: parsed.data.deviceName?.trim() || null,
      deviceModel: parsed.data.deviceModel?.trim() || null,
      appVersion: parsed.data.appVersion?.trim() || null,
      sessionId: session.id,
      lastSeenAt: new Date(),
    },
    update: {
      userId: session.userId,
      platform: parsed.data.platform ?? 'iOS',
      bundleId: parsed.data.bundleId?.trim() || null,
      environment: parsed.data.environment?.trim() || null,
      deviceName: parsed.data.deviceName?.trim() || null,
      deviceModel: parsed.data.deviceModel?.trim() || null,
      appVersion: parsed.data.appVersion?.trim() || null,
      sessionId: session.id,
      revokedAt: null,
      lastSeenAt: new Date(),
    },
    select: {
      id: true,
      token: true,
      platform: true,
      bundleId: true,
      environment: true,
      deviceName: true,
      deviceModel: true,
      appVersion: true,
      lastSeenAt: true,
    },
  });

  return NextResponse.json({ device });
}
