import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MercadoPagoConfig, Payment } from 'mercadopago';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { formData, childId } = await req.json();
  if (!formData) {
    return NextResponse.json({ error: 'Missing formData' }, { status: 400 });
  }

  const activity = await prisma.activity.findUnique({
    where: { id: params.id },
  });
  if (!activity) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN!,
  });
  const payment = await new Payment(client).create({
    body: {
      ...formData,
      transaction_amount: Number(activity.price),
      description: activity.name,
    },
  });

  const receipt = payment.id?.toString();
  const date = payment.date_approved || payment.date_created || new Date();

  await prisma.activityParticipant.upsert({
    where: {
      activityId_userId_childId: {
        activityId: params.id,
        userId: (session.user as any).id,
        childId: childId ?? null,
      },
    },
    create: {
      activityId: params.id,
      userId: (session.user as any).id,
      childId: childId ?? null,
      receipt,
      receiptDate: new Date(date),
    },
    update: {
      receipt,
      receiptDate: new Date(date),
    },
  });

  return NextResponse.json({ success: true });
}
