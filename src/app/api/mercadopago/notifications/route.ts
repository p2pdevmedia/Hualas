import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = new URL(req.url);
    const topic =
      url.searchParams.get('type') ??
      url.searchParams.get('topic') ??
      (typeof body.topic === 'string' ? body.topic : undefined) ??
      (typeof body.type === 'string' ? body.type : undefined) ??
      'unknown';

    await prisma.mercadoPagoNotification.create({
      data: {
        topic,
        data: body,
      },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Mercado Pago notification error', error);
    return new NextResponse('Invalid request', { status: 400 });
  }
}
