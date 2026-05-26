import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getActivityParticipantKey } from '@/lib/activity-participants';
import { registerActivityParticipantPayment } from '@/lib/activity-payments';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getMercadoPagoCredentials } from '@/lib/mercadopago';
import {
  parseSocialFeeParticipants,
  parseSocialFeePaymentLines,
  registerSocialFeePayment,
  type SocialFeeParticipant,
} from '@/lib/social-fee';
import {
  parseMercadoPagoReferences,
  syncMercadoPagoApprovedPayment,
} from '@/lib/services/mercado-pago-accounting-service';
import {
  getMercadoPagoWebhookSecret,
  verifyMercadoPagoWebhookSignature,
} from '@/lib/mercadopago-webhooks';
import {
  notifyOrderPaymentApproved,
  notifyActivityPaymentApproved,
  notifyActivityCapacityFull,
} from '@/lib/notifications/notification-service';

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const dataId = url.searchParams.get('data.id') || url.searchParams.get('id');
  const signatureIsValid = verifyMercadoPagoWebhookSignature({
    signatureHeader: req.headers.get('x-signature'),
    requestId: req.headers.get('x-request-id'),
    dataId,
    secret: getMercadoPagoWebhookSecret(),
  });
  if (!signatureIsValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: Prisma.InputJsonValue | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const topic =
    (body as { type?: string } | null)?.type ||
    url.searchParams.get('type') ||
    url.searchParams.get('topic');
  const id =
    (body as { data?: { id?: string } } | null)?.data?.id ||
    url.searchParams.get('data.id') ||
    url.searchParams.get('id');

  await prisma.mercadoPagoNotification.create({
    data: {
      topic: topic ?? undefined,
      data: body === null ? Prisma.JsonNull : body,
    },
  });

  if (topic !== 'payment' || !id) {
    return NextResponse.json({ received: true });
  }

  const existingPayment = await prisma.payment.findUnique({
    where: { id: `mp-payment:${id}` },
    select: { id: true },
  });
  if (existingPayment) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const { accessToken } = getMercadoPagoCredentials();
  if (!accessToken) {
    return NextResponse.json({ received: true });
  }

  const client = new MercadoPagoConfig({
    accessToken,
  });

  try {
    const payment = await new Payment(client).get({ id });

    if (payment.status !== 'approved' || !payment.external_reference) {
      return NextResponse.json({ received: true });
    }

    const references = parseMercadoPagoReferences(payment.external_reference);

    for (const reference of references) {
      const { activityId, userId, childId, groupId, activityDayId } = reference;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user || user.role !== 'MEMBER') {
        console.warn(
          `[mercadopago] User ${userId} is not MEMBER (role: ${user?.role}), skipping activity participant creation`
        );
        continue;
      }

      const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        select: {
          groups: {
            select: {
              id: true,
              capacity: true,
              _count: { select: { members: true } },
            },
          },
          participants: {
            where: { status: 'ACTIVE' },
            select: {
              id: true,
            },
          },
          price: true,
        },
      });

      if (!activity) {
        continue;
      }

      const selectedGroup = groupId
        ? activity.groups.find((group) => group.id === groupId)
        : null;

      const participantChildId = childId || null;
      const participantKey = getActivityParticipantKey(
        activityId,
        userId,
        participantChildId
      );
      const existingParticipant = await prisma.activityParticipant.findUnique({
        where: {
          participantKey,
        },
        select: {
          id: true,
        },
      });

      const activityCapacity =
        activity.groups.length === 0 ||
        activity.groups.some((g) => g.capacity == null)
          ? null
          : activity.groups.reduce((sum, g) => sum + (g.capacity as number), 0);

      if (
        activityCapacity != null &&
        !existingParticipant &&
        activity.participants.length >= activityCapacity
      ) {
        console.warn(
          `[mercadopago] Activity ${activityId} reached capacity, skipping participant upsert`
        );
        continue;
      }

      if (
        selectedGroup?.capacity != null &&
        !existingParticipant &&
        selectedGroup._count.members >= selectedGroup.capacity
      ) {
        console.warn(
          `[mercadopago] Group ${selectedGroup.id} reached capacity, skipping participant upsert`
        );
        continue;
      }

      const receipt = payment.id?.toString();
      const date = payment.date_approved || payment.date_created || new Date();
      const participantData = {
        participantKey,
        receipt,
        receiptDate: new Date(date),
        status: 'ACTIVE' as const,
        withdrawnAt: null,
      };

      const participant = await prisma.activityParticipant.upsert({
        where: {
          participantKey,
        },
        create: {
          activityId,
          userId,
          childId: participantChildId,
          ...participantData,
        },
        update: participantData,
        select: { id: true },
      });

      if (selectedGroup) {
        await prisma.activityGroupMember.upsert({
          where: { activityParticipantId: participant.id },
          create: {
            activityGroupId: selectedGroup.id,
            activityParticipantId: participant.id,
          },
          update: { activityGroupId: selectedGroup.id },
        });
      }

      await registerActivityParticipantPayment({
        activityParticipantId: participant.id,
        activityId,
        userId,
        childId: participantChildId,
        groupId,
        activityDayId,
        amount: Number(activity.price),
        paymentReference: payment.id?.toString() ?? id.toString(),
        paidAt: participantData.receiptDate,
      });

      if (!existingParticipant) {
        notifyActivityPaymentApproved(participant.id).catch((err) =>
          console.error(
            '[notifications] notifyActivityPaymentApproved failed',
            err
          )
        );
        if (
          activityCapacity != null &&
          activity.participants.length + 1 >= activityCapacity
        ) {
          notifyActivityCapacityFull(activityId).catch((err) =>
            console.error(
              '[notifications] notifyActivityCapacityFull failed',
              err
            )
          );
        }
      }
    }

    const socialFeeAmount = Number(payment.metadata?.socialFeeAmount ?? 0);
    const socialFeePaymentLines = parseSocialFeePaymentLines(
      payment.metadata?.socialFeePaymentLines
    );
    const participants = parseSocialFeeParticipants(
      payment.metadata?.socialFeeParticipants
    );
    const legacyShouldChargeSocialFee = Boolean(
      payment.metadata?.shouldChargeSocialFee
    );

    const participantsToRegister: SocialFeeParticipant[] =
      participants.length > 0
        ? participants
        : legacyShouldChargeSocialFee
          ? references.map(
              (reference): SocialFeeParticipant => ({
                userId: reference.userId,
                childId: reference.childId,
              })
            )
          : [];

    if (socialFeePaymentLines.length > 0) {
      for (const line of socialFeePaymentLines) {
        await registerSocialFeePayment({
          userId: line.userId,
          childId: line.childId,
          amount: line.amount,
          mercadoPagoPaymentId: payment.id?.toString() ?? id.toString(),
          periodMonth: line.month,
          periodYear: line.year,
        });
      }
    } else if (socialFeeAmount > 0 && participantsToRegister.length > 0) {
      const uniqueParticipants = new Map(
        participantsToRegister.map((participant) => [
          `${participant.userId}:${participant.childId ?? 'self'}`,
          participant,
        ])
      );

      for (const participant of uniqueParticipants.values()) {
        await registerSocialFeePayment({
          userId: participant.userId,
          childId: participant.childId,
          amount: socialFeeAmount,
          mercadoPagoPaymentId: payment.id?.toString() ?? id.toString(),
        });
      }
    }

    const settlement = await syncMercadoPagoApprovedPayment({
      payment,
      references,
      userId: references[0]?.userId ?? String(payment.metadata?.userId ?? ''),
      socialFeeAmount,
      socialFeeParticipantCount:
        socialFeePaymentLines.length || participantsToRegister.length,
      familyDiscountAmount: Number(payment.metadata?.familyDiscountAmount ?? 0),
    });

    if (settlement?.created) {
      await notifyOrderPaymentApproved(settlement.paymentId);
    }
  } catch (error: any) {
    if (error?.status !== 404) {
      throw error;
    }
  }

  return NextResponse.json({ received: true });
}

export async function OPTIONS() {
  return NextResponse.json({});
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notifications = await prisma.mercadoPagoNotification.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(notifications);
}
