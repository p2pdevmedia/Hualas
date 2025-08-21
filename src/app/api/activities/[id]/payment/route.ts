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

  const { paymentId } = await req.json();
  if (!paymentId) {
    return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 });
  }

  const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN!,
  });
  const payment = await new Payment(client).get({ id: paymentId });

  const receipt = payment.id?.toString();
  const date = payment.date_approved || payment.date_created || new Date();

  await prisma.activityParticipant.upsert({
    where: {
      activityId_userId: {
        activityId: params.id,
        userId: (session.user as any).id,
      },
    },
    create: {
      activityId: params.id,
      userId: (session.user as any).id,
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
