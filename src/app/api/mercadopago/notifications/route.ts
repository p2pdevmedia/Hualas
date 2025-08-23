import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MercadoPagoConfig, Payment } from 'mercadopago';

export async function POST(req: NextRequest) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const topic =
    body?.type ||
    req.nextUrl.searchParams.get('type') ||
    req.nextUrl.searchParams.get('topic');
  const id =
    body?.data?.id ||
    req.nextUrl.searchParams.get('data.id') ||
    req.nextUrl.searchParams.get('id');

  await prisma.mercadoPagoNotification.create({
    data: {
      topic: topic ?? undefined,
      data: body,
    },
  });

  if (topic === 'payment' && id) {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN!,
    });
    const payment = await new Payment(client).get({ id });
    if (payment.status === 'approved' && payment.external_reference) {
      const [activityId, userId, childId] = payment.external_reference.split(':');
      const receipt = payment.id?.toString();
      const date = payment.date_approved || payment.date_created || new Date();

      await prisma.activityParticipant.upsert({
        where: {
          activityId_userId_childId: {
            activityId,
            userId,
            childId: childId || null,
          },
        },
        create: {
          activityId,
          userId,
          childId: childId || null,
          receipt,
          receiptDate: new Date(date),
        },
        update: {
          receipt,
          receiptDate: new Date(date),
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}

export async function OPTIONS() {
  return NextResponse.json({});
}

export async function GET() {
  const notifications = await prisma.mercadoPagoNotification.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(notifications);
}
