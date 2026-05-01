import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ZodError } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { subscriptionUpsertSchema } from '@/lib/validations/notifications';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  let parsed: ReturnType<typeof subscriptionUpsertSchema.parse>;
  try {
    parsed = subscriptionUpsertSchema.parse(await req.json());
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const subscription = await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.endpoint },
    create: {
      userId,
      endpoint: parsed.endpoint,
      p256dh: parsed.keys.p256dh,
      auth: parsed.keys.auth,
      userAgent: parsed.userAgent ?? null,
    },
    update: {
      userId,
      p256dh: parsed.keys.p256dh,
      auth: parsed.keys.auth,
      userAgent: parsed.userAgent ?? null,
      lastUsedAt: new Date(),
      failedAt: null,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: subscription.id });
}
