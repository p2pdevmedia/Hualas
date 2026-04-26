import { NextRequest, NextResponse } from 'next/server';
import { getActivityParticipantKey } from '@/lib/activity-participants';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getMercadoPagoCredentials } from '@/lib/mercadopago';

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
    const { accessToken } = getMercadoPagoCredentials();
    if (!accessToken) {
      return NextResponse.json({ received: true });
    }

    const client = new MercadoPagoConfig({
      accessToken,
    });

    try {
      const payment = await new Payment(client).get({ id });

      if (payment.status === 'approved' && payment.external_reference) {
        const [activityId, userId, childId] =
          payment.external_reference.split(':');
        const activity = await prisma.activity.findUnique({
          where: { id: activityId },
          select: {
            capacity: true,
            participants: {
              select: {
                id: true,
              },
            },
          },
        });
        if (!activity) {
          return NextResponse.json({ received: true });
        }
        const participantChildId = childId || null;
        const participantKey = getActivityParticipantKey(
          activityId,
          userId,
          participantChildId
        );
        const existingParticipant = await prisma.activityParticipant.findUnique(
          {
            where: {
              participantKey,
            },
            select: {
              id: true,
            },
          }
        );
        if (
          activity.capacity != null &&
          !existingParticipant &&
          activity.participants.length >= activity.capacity
        ) {
          console.warn(
            `[mercadopago] Activity ${activityId} reached capacity, skipping participant upsert`
          );
          return NextResponse.json({ received: true });
        }
        const receipt = payment.id?.toString();
        const date =
          payment.date_approved || payment.date_created || new Date();

        const participantData = {
          participantKey,
          receipt,
          receiptDate: new Date(date),
        };
        await prisma.activityParticipant.upsert({
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
        });
      }
    } catch (error: any) {
      // ignore missing payments, rethrow other errors
      if (error?.status !== 404) {
        throw error;
      }
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
