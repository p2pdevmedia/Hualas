import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActivityParticipantKey } from '@/lib/activity-participants';
import { prisma } from '@/lib/prisma';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getMercadoPagoCredentials } from '@/lib/mercadopago';

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

  const { accessToken } = getMercadoPagoCredentials();

  if (!accessToken) {
    return NextResponse.json({ error: 'MP not configured' }, { status: 500 });
  }

  try {
    const client = new MercadoPagoConfig({
      accessToken,
    });
    const payment = await new Payment(client).get({ id: paymentId });

    if (payment.status !== 'approved') {
      return NextResponse.json(
        { error: 'Payment not approved', status: payment.status },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;
    const participantChildId = childId ?? null;
    const participantKey = getActivityParticipantKey(
      params.id,
      userId,
      participantChildId
    );
    const receipt = payment.id?.toString() ?? null;
    const date = payment.date_approved || payment.date_created || new Date();
    const receiptDate = new Date(date);

    await prisma.mercadoPagoNotification.create({
      data: {
        topic: 'payment',
        data: {
          source: 'return',
          paymentId,
          activityId: params.id,
          childId: participantChildId,
        },
      },
    });

    await prisma.activityParticipant.upsert({
      where: {
        participantKey,
      },
      create: {
        activityId: params.id,
        userId,
        childId: participantChildId,
        participantKey,
        receipt,
        receiptDate,
      },
      update: {
        receipt,
        receiptDate,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[payment] Error:', error?.message || error);
    return NextResponse.json(
      {
        error: 'Error al registrar el pago',
        detail: String(error?.message || error),
      },
      { status: 500 }
    );
  }
}
