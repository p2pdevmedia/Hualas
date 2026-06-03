import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getMercadoPagoCredentials } from '@/lib/mercadopago';
import {
  parseSocialFeeParticipants,
  registerSocialFeePayment,
} from '@/lib/social-fee';
import {
  parseMercadoPagoReferences,
  syncMercadoPagoApprovedPayment,
} from '@/lib/services/mercado-pago-accounting-service';
import { notifyOrderPaymentApproved } from '@/lib/notifications/notification-service';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import { finalizePaidActivityEnrollment } from '@/lib/services/activity-enrollment-finalization';

function metadataValue(
  metadata: Record<string, unknown> | null | undefined,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (value != null && value !== '') return String(value);
  }
  return null;
}

function paymentAmountInCents(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

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
    const references = parseMercadoPagoReferences(payment.external_reference);
    const matchingReference = references.find(
      (reference) =>
        reference.activityId === params.id &&
        reference.userId === userId &&
        (childId ? reference.childId === childId : true)
    );

    if (!matchingReference) {
      return NextResponse.json(
        { error: 'Payment does not belong to this user or activity' },
        { status: 403 }
      );
    }

    const participantChildId = matchingReference.childId;
    if (childId && childId !== participantChildId) {
      return NextResponse.json(
        { error: 'Payment child does not match request' },
        { status: 403 }
      );
    }

    if (participantChildId) {
      const ownerIds = await getAccessibleChildOwnerIds(userId);
      const child = await prisma.child.findFirst({
        where: { id: participantChildId, userId: { in: ownerIds } },
        select: { id: true },
      });
      if (!child) {
        return NextResponse.json(
          { error: 'Payment child is not accessible' },
          { status: 403 }
        );
      }
    }

    const metadata = payment.metadata as Record<string, unknown> | undefined;
    const metadataActivityId = metadataValue(
      metadata,
      'activityId',
      'activity_id'
    );
    const metadataUserId = metadataValue(metadata, 'userId', 'user_id');
    const metadataChildId = metadataValue(metadata, 'childId', 'child_id');
    if (
      (metadataActivityId && metadataActivityId !== params.id) ||
      (metadataUserId && metadataUserId !== userId) ||
      (metadataChildId && metadataChildId !== participantChildId)
    ) {
      return NextResponse.json(
        { error: 'Payment metadata does not match request' },
        { status: 403 }
      );
    }

    const activity = await prisma.activity.findUnique({
      where: { id: params.id },
      select: { price: true },
    });
    const paidAmount = paymentAmountInCents(payment.transaction_amount);
    if (
      !activity ||
      paidAmount == null ||
      paidAmount < Number(activity.price)
    ) {
      return NextResponse.json(
        { error: 'Payment amount does not match activity' },
        { status: 400 }
      );
    }

    const receipt = payment.id?.toString() ?? null;
    const date = payment.date_approved || payment.date_created || new Date();

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

    const enrollment = await finalizePaidActivityEnrollment({
      activityId: params.id,
      userId,
      childId: participantChildId,
      groupId: matchingReference.groupId,
      activityDayId: matchingReference.activityDayId,
      paymentReference: payment.id?.toString() ?? paymentId,
      paidAt: date,
      receipt,
      receiptDate: date,
    });

    if (enrollment.status === 'skipped') {
      return NextResponse.json(
        { error: 'La actividad ya no tiene cupo disponible.' },
        { status: 409 }
      );
    }

    const socialFeeAmount = Number(payment.metadata?.socialFeeAmount ?? 0);
    const participants = parseSocialFeeParticipants(
      payment.metadata?.socialFeeParticipants
    );
    if (participants.length > 0 && socialFeeAmount > 0) {
      const uniqueParticipants = new Map(
        participants.map((participant) => [
          `${participant.userId}:${participant.childId ?? 'self'}`,
          participant,
        ])
      );

      for (const participant of uniqueParticipants.values()) {
        await registerSocialFeePayment({
          userId: participant.userId,
          childId: participant.childId,
          amount: socialFeeAmount,
          mercadoPagoPaymentId: payment.id?.toString() ?? paymentId,
        });
      }
    }

    const settlement = await syncMercadoPagoApprovedPayment({
      payment,
      references,
      userId,
      socialFeeAmount,
      socialFeeParticipantCount: participants.length,
    });

    if (settlement?.created) {
      await notifyOrderPaymentApproved(settlement.paymentId);
    }

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
