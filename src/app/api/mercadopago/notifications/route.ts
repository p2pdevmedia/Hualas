import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getActivityParticipantKey } from '@/lib/activity-participants';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getMercadoPagoCredentials } from '@/lib/mercadopago';
import {
  parseSocialFeeParticipants,
  registerSocialFeePayment,
  type SocialFeeParticipant,
} from '@/lib/social-fee';
import {
  notifyActivityPaymentApproved,
  notifyActivityCapacityFull,
} from '@/lib/notifications/notification-service';

export async function POST(req: NextRequest) {
  let body: Prisma.InputJsonValue | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const topic =
    (body as { type?: string } | null)?.type ||
    req.nextUrl.searchParams.get('type') ||
    req.nextUrl.searchParams.get('topic');
  const id =
    (body as { data?: { id?: string } } | null)?.data?.id ||
    req.nextUrl.searchParams.get('data.id') ||
    req.nextUrl.searchParams.get('id');

  await prisma.mercadoPagoNotification.create({
    data: {
      topic: topic ?? undefined,
      data: body === null ? Prisma.JsonNull : body,
    },
  });

  if (topic !== 'payment' || !id) {
    return NextResponse.json({ received: true });
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

    const references: string[] = payment.external_reference.startsWith('cart|')
      ? payment.external_reference
          .replace('cart|', '')
          .split(',')
          .filter(Boolean)
      : [payment.external_reference];

    for (const reference of references) {
      const [activityId, userId, childId] = reference.split(':');

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
          groups: { select: { capacity: true } },
          participants: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!activity) {
        continue;
      }

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

      const receipt = payment.id?.toString();
      const date = payment.date_approved || payment.date_created || new Date();
      const participantData = {
        participantKey,
        receipt,
        receiptDate: new Date(date),
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
          ? references.map((reference): SocialFeeParticipant => {
              const [, userId, childId] = reference.split(':');
              return {
                userId,
                childId: childId || null,
              };
            })
          : [];

    if (socialFeeAmount > 0 && participantsToRegister.length > 0) {
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
