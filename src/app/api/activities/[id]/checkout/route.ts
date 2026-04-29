import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import {
  getMercadoPagoCheckoutSettings,
  getMercadoPagoCredentials,
} from '@/lib/mercadopago';
import {
  getSocialFeeAmount,
  hasSocialFeeForCurrentMonth,
  normalizeSocialFeeParticipant,
  serializeSocialFeeParticipants,
} from '@/lib/social-fee';

function getAppUrl(req: Request) {
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const forwardedHost =
    req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (forwardedHost) {
    return `${forwardedProto || 'https'}://${forwardedHost}`.replace(/\/$/, '');
  }

  const configuredUrl = process.env.NEXTAUTH_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  return new URL(req.url).origin.replace(/\/$/, '');
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const { accessToken, environment } = getMercadoPagoCredentials();
  const checkoutSettings = getMercadoPagoCheckoutSettings();

  if (!accessToken) {
    console.error(
      `[checkout] Access token de Mercado Pago no configurado para ${environment}`
    );
    return NextResponse.json(
      { error: 'Configuración de pago incompleta. Contactá al administrador.' },
      { status: 500 }
    );
  }

  const searchParams = new URL(req.url).searchParams;
  const childId = searchParams.get('childId') || undefined;

  let activity: any = null;
  try {
    activity = await prisma.activity.findUnique({
      where: { id: params.id },
      include: { participants: true },
    });
  } catch (e: any) {
    console.error('[checkout] DB error:', e?.message);
    return NextResponse.json(
      { error: 'Error al buscar la actividad' },
      { status: 500 }
    );
  }

  if (!activity) {
    return NextResponse.json(
      { error: 'Actividad no encontrada' },
      { status: 404 }
    );
  }

  if (
    activity.capacity != null &&
    activity.participants.length >= activity.capacity
  ) {
    return NextResponse.json(
      { error: 'La actividad ya alcanzó su cupo de inscripciones.' },
      { status: 409 }
    );
  }

  const unitPrice = Number(activity.price);

  const participant = normalizeSocialFeeParticipant({
    userId: (session.user as any).id,
    childId: childId ?? null,
  });
  const shouldChargeSocialFee =
    !(await hasSocialFeeForCurrentMonth(participant));
  const socialFeeAmount = shouldChargeSocialFee
    ? await getSocialFeeAmount()
    : 0;
  if (!unitPrice || unitPrice <= 0) {
    return NextResponse.json(
      { error: 'El precio de la actividad no es válido.' },
      { status: 400 }
    );
  }

  try {
    const client = new MercadoPagoConfig({
      accessToken,
    });

    const nameParts = (session.user?.name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const externalReference = [params.id, (session.user as any).id, childId]
      .filter(Boolean)
      .join(':');

    const appUrl = getAppUrl(req);
    const returnBase = process.env.MP_RETURN_URL_BASE?.trim() || appUrl;
    const base = `${returnBase}/activities/${activity.id}`;
    const successUrl = childId ? `${base}?childId=${childId}` : base;
    const notificationUrl =
      process.env.MP_NOTIFICATION_URL?.trim() ||
      `${appUrl}/api/mercadopago/notifications`;

    const preference = new Preference(client);
    const items = [
      {
        id: activity.id,
        title: activity.name,
        description: activity.description || activity.name,
        quantity: 1,
        unit_price: unitPrice,
        currency_id: 'ARS',
        category_id: 'services',
      },
    ];

    if (socialFeeAmount > 0) {
      items.push({
        id: `social-fee:${new Date().getUTCFullYear()}-${new Date().getUTCMonth() + 1}`,
        title: 'Cuota social mensual',
        description: 'Cuota social mensual, individual y obligatoria.',
        quantity: 1,
        unit_price: socialFeeAmount,
        currency_id: 'ARS',
        category_id: 'services',
      });
    }
    const preferenceExpiresAt = new Date(
      Date.now() + checkoutSettings.expiresInMinutes * 60 * 1000
    );

    const result = await preference.create({
      body: {
        payer: {
          first_name: firstName,
          last_name: lastName,
          email: session.user?.email || undefined,
        },
        items,
        back_urls: {
          success: successUrl,
          failure: base,
          pending: base,
        },

        auto_return: checkoutSettings.autoReturn,
        binary_mode: checkoutSettings.binaryMode,
        payment_methods: {
          installments: checkoutSettings.maxInstallments,
          excluded_payment_methods:
            checkoutSettings.excludedPaymentMethodIds.map((id) => ({ id })),
          excluded_payment_types: checkoutSettings.excludedPaymentTypeIds.map(
            (id) => ({ id })
          ),
        },
        expires: true,
        expiration_date_to: preferenceExpiresAt.toISOString(),
        notification_url: notificationUrl,
        statement_descriptor: process.env.MP_STATEMENT_DESCRIPTOR || 'HUALAS',
        external_reference: externalReference,
        metadata: {
          activityId: activity.id,
          userId: participant.userId,
          childId: participant.childId,
          environment,
          socialFeeAmount,
          shouldChargeSocialFee,
          socialFeeParticipants: serializeSocialFeeParticipants(
            shouldChargeSocialFee ? [participant] : []
          ),
        },
      },
    });

    const isTesting = process.env.MP_ENVIRONMENT === 'testing';
    const redirectUrl = isTesting
      ? (result.sandbox_init_point ?? result.init_point)
      : (result.init_point ?? result.sandbox_init_point);
    if (!redirectUrl) {
      console.error('[checkout] No init_point en respuesta MP:', result);
      return NextResponse.json(
        { error: 'No se pudo generar el link de pago. Intentá de nuevo.' },
        { status: 500 }
      );
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error(
      '[checkout] Mercado Pago error:',
      error?.message || error,
      error?.cause
    );
    return NextResponse.json(
      {
        error: 'Error al crear el pago en Mercado Pago.',
        detail: String(error?.cause ?? error?.message ?? error),
      },
      { status: 502 }
    );
  }
}
