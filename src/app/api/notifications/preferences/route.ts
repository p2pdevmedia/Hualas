import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ZodError } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  NOTIFICATION_TYPES,
  preferenceUpdateSchema,
} from '@/lib/validations/notifications';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const rows = await prisma.notificationPreference.findMany({
    where: { userId },
    select: { type: true, inApp: true, push: true },
  });
  const map: Record<string, { inApp: boolean; push: boolean }> = {};
  for (const type of NOTIFICATION_TYPES) {
    map[type] = { inApp: true, push: true };
  }
  for (const row of rows) {
    map[row.type] = { inApp: row.inApp, push: row.push };
  }
  return NextResponse.json({ preferences: map });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  let parsed: ReturnType<typeof preferenceUpdateSchema.parse>;
  try {
    parsed = preferenceUpdateSchema.parse(await req.json());
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  await prisma.notificationPreference.upsert({
    where: { userId_type: { userId, type: parsed.type } },
    create: {
      userId,
      type: parsed.type,
      inApp: parsed.inApp,
      push: parsed.push,
    },
    update: {
      inApp: parsed.inApp,
      push: parsed.push,
    },
  });

  return NextResponse.json({ ok: true });
}
