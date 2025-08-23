import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const topic =
    req.nextUrl.searchParams.get('type') ||
    req.nextUrl.searchParams.get('topic');
  await prisma.mercadoPagoNotification.create({
    data: {
      topic: topic ?? undefined,
      data: body,
    },
  });
  return NextResponse.json({ received: true });
}

export async function GET() {
  const notifications = await prisma.mercadoPagoNotification.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(notifications);
}
