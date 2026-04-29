import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getMercadoPagoCheckoutSettings,
  getMercadoPagoCredentials,
} from '@/lib/mercadopago';
import {
  getSocialFeeAmount,
  hasSocialFeeForCurrentMonth,
  normalizeSocialFeeParticipant,
  serializeSocialFeeParticipants,
  type SocialFeeParticipant,
} from '@/lib/social-fee';

type CartItem = {
  activityId: string;
  target?: string;
  targetLabel?: string;
};

function getAppUrl(req: Request) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}

function getParticipantFromTarget(userId: string, target?: string) {
  if (!target || target === 'self') {
    return normalizeSocialFeeParticipant({ userId, childId: null });
  }

  return normalizeSocialFeeParticipant({ userId, childId: target });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const items = Array.isArray((payload as { items?: unknown } | null)?.items)
    ? ((payload as { items: CartItem[] }).items ?? [])
    : [];

  if (!items.length) {
    return NextResponse.json(
      { error: 'El carrito está vacío.' },
      { status: 400 }
    );
  }

  const uniqueIds = [...new Set(items.map((item) => item.activityId))];
  const activities = await prisma.activity.findMany({
    where: { id: { in: uniqueIds } },
    include: { participants: { select: { id: true } } },
  });
  const activityById = new Map(
    activities.map((activity) => [activity.id, activity])
  );

  for (const item of items) {
    const activity = activityById.get(item.activityId);
    if (!activity) {
      return NextResponse.json(
        { error: 'Una actividad no existe.' },
        { status: 404 }
      );
    }

    if (
      activity.capacity != null &&
      activity.participants.length >= activity.capacity
    ) {
      return NextResponse.json(
        { error: `La actividad ${activity.name} no tiene cupo.` },
        { status: 409 }
      );
    }
  }

  const userId = (session.user as { id: string }).id;
  const childTargets = [
    ...new Set(
      items
        .map((item) => item.target)
        .filter((target): target is string =>
          Boolean(target && target !== 'self')
        )
    ),
  ];

  const children = childTargets.length
    ? await prisma.child.findMany({
        where: {
          id: { in: childTargets },
          userId,
        },
        select: {
          id: true,
          name: true,
          lastName: true,
        },
      })
    : [];

  const childById = new Map(children.map((child) => [child.id, child]));
  for (const target of childTargets) {
    if (!childById.has(target)) {
      return NextResponse.json(
        { error: 'Uno de los hijos seleccionados no pertenece al usuario.' },
        { status: 403 }
      );
    }
  }

  const participantByKey = new Map<string, SocialFeeParticipant>();
  for (const item of items) {
    const participant = getParticipantFromTarget(userId, item.target);
    const key = `${participant.userId}:${participant.childId ?? 'self'}`;
    participantByKey.set(key, participant);
  }

  const socialFeeAmount = await getSocialFeeAmount();
  const socialFeeParticipants: SocialFeeParticipant[] =
    socialFeeAmount > 0
      ? (
          await Promise.all(
            [...participantByKey.values()].map(async (participant) => ({
              participant,
              owesSocialFee: !(await hasSocialFeeForCurrentMonth(participant)),
            }))
          )
        )
          .filter((entry) => entry.owesSocialFee)
          .map((entry) => entry.participant)
      : [];

  const { accessToken, environment } = getMercadoPagoCredentials();
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Configuración de pago incompleta.' },
      { status: 500 }
    );
  }

  const mpItems = items.map((item) => {
    const activity = activityById.get(item.activityId)!;
    return {
      id: activity.id,
      title: `${activity.name}${item.target && item.target !== 'self' ? ' (menor)' : ''}`,
      quantity: 1,
      unit_price: Number(activity.price),
      currency_id: 'ARS',
      category_id: 'services',
    };
  });

  if (socialFeeAmount > 0) {
    for (const participant of socialFeeParticipants) {
      mpItems.push({
        id: `social-fee:${participant.userId}:${participant.childId ?? 'self'}`,
        title: 'Cuota social mensual',
        quantity: 1,
        unit_price: socialFeeAmount,
        currency_id: 'ARS',
        category_id: 'services',
      });
    }
  }

  const refs = items.map(
    (item) =>
      `${item.activityId}:${userId}:${item.target && item.target !== 'self' ? item.target : ''}`
  );

  const client = new MercadoPagoConfig({ accessToken });
  const checkoutSettings = getMercadoPagoCheckoutSettings();
  const appUrl = getAppUrl(req);
  const base = `${appUrl}/activities/cart`;
  const result = await new Preference(client).create({
    body: {
      items: mpItems,
      external_reference: `cart|${refs.join(',')}`,
      back_urls: { success: base, failure: base, pending: base },
      auto_return: checkoutSettings.autoReturn,
      binary_mode: checkoutSettings.binaryMode,
      notification_url:
        process.env.MP_NOTIFICATION_URL?.trim() ||
        `${appUrl}/api/mercadopago/notifications`,
      metadata: {
        mode: 'cart',
        refs,
        userId,
        environment,
        socialFeeAmount,
        socialFeeParticipants: serializeSocialFeeParticipants(
          socialFeeParticipants
        ),
      },
    },
  });

  return NextResponse.json({
    redirectUrl: result.init_point ?? result.sandbox_init_point,
  });
}
