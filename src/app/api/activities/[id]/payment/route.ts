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

  let paymentId: string | undefined;
  let childId: string | undefined;

  try {
    const body = await req.json();
    paymentId = body.paymentId;
    childId = body.childId || undefined;
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!paymentId) {
    return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 });
  }

  if (!process.env.MP_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'MP not configured' }, { status: 500 });
  }

  try {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN,
    });
    const payment = await new Payment(client).get({ id: paymentId });

    if (payment.status !== 'approved') {
      return NextResponse.json(
        { error: 'Payment not approved', status: payment.status },
        { status: 400 }
      );
    }

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
  } catch (error: any) {
    console.error('[payment] Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Error al registrar el pago', detail: String(error?.message || error) },
      { status: 500 }
    );
  }
}
