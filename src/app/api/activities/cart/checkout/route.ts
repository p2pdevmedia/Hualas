import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { authOptions } from '@/lib/auth';
import {
  getMercadoPagoCheckoutSettings,
  getMercadoPagoCredentials,
} from '@/lib/mercadopago';
import {
  buildCartQuote,
  buildCartQuoteErrorResponse,
  toMercadoPagoItems,
} from '@/lib/cart-checkout';
import { createManualPaymentCheckout } from '@/lib/services/manual-payment-service';
import { prisma } from '@/lib/prisma';
import {
  checkUserProfile,
  checkChildProfile,
} from '@/lib/participant-profile-check';
import { getAccessibleChildrenWhere } from '@/lib/family-access';

function buildProfileIncompleteResponse(message: string) {
  return NextResponse.json(
    {
      error: message,
      actionUrl: '/profile',
      actionLabel: 'Editar perfil',
    },
    { status: 422 }
  );
}

type CartItem = {
  activityId: string;
  target?: string;
  targetLabel?: string;
  groupId?: string;
  activityDayId?: string;
  activityDayLabel?: string;
};

function isManualPaymentMethod(value: unknown) {
  return typeof value === 'string' && value === 'MANUAL_TRANSFER';
}

function getAppUrl(req: Request) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = req.headers.get('content-type') ?? '';
  const isFormData = contentType.includes('multipart/form-data');

  let items: CartItem[] = [];
  let paymentMethod: unknown;
  let proofFile: File | null = null;
  let socialFeeOnly = false;
  let socialFeeMonths = 1;

  if (isFormData) {
    const formData = await req.formData();
    paymentMethod = formData.get('paymentMethod');
    socialFeeOnly = formData.get('socialFeeOnly') === 'true';
    socialFeeMonths = Number(formData.get('socialFeeMonths') ?? 1);
    const rawItems = formData.get('items');
    proofFile =
      formData.get('proof') instanceof File
        ? (formData.get('proof') as File)
        : null;

    if (typeof rawItems === 'string') {
      try {
        const parsed = JSON.parse(rawItems);
        items = Array.isArray(parsed) ? (parsed as CartItem[]) : [];
      } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
      }
    }
  } else {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    paymentMethod = (payload as { paymentMethod?: unknown } | null)
      ?.paymentMethod;
    items = Array.isArray((payload as { items?: unknown } | null)?.items)
      ? ((payload as { items: CartItem[] }).items ?? [])
      : [];
    socialFeeOnly =
      (payload as { socialFeeOnly?: unknown } | null)?.socialFeeOnly === true;
    socialFeeMonths = Number(
      (payload as { socialFeeMonths?: unknown } | null)?.socialFeeMonths ?? 1
    );
  }

  const userId = (session.user as { id: string }).id;

  // Validate participant profiles before checkout
  {
    const childIds = items
      .filter((item) => item.target && item.target !== 'self')
      .map((item) => item.target as string);

    const [userProfile, children] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          lastName: true,
          dni: true,
          birthDate: true,
          address: true,
          phone: true,
        },
      }),
      childIds.length > 0
        ? prisma.child.findMany({
            where: {
              id: { in: childIds },
              ...(await getAccessibleChildrenWhere(userId)),
            },
            select: {
              id: true,
              name: true,
              lastName: true,
              documentNumber: true,
              birthDate: true,
              address: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const hasSelfItem = items.some(
      (item) => !item.target || item.target === 'self'
    );
    if (hasSelfItem && userProfile) {
      const check = checkUserProfile(userProfile);
      if (!check.valid) {
        return buildProfileIncompleteResponse(
          `Para inscribirte completá tu perfil: ${check.missingFields.join(', ')}.`
        );
      }
    }

    const childMap = new Map(children.map((c) => [c.id, c]));
    for (const item of items) {
      if (item.target && item.target !== 'self') {
        const child = childMap.get(item.target);
        if (!child) continue;
        const check = checkChildProfile(child, userProfile?.phone ?? null);
        if (!check.valid) {
          return buildProfileIncompleteResponse(
            `Para inscribir a ${child.name} completá: ${check.missingFields.join(', ')}.`
          );
        }
      }
    }
  }

  let quote;
  try {
    quote = await buildCartQuote({
      userId,
      items,
      ...(socialFeeOnly ? { socialFeeOnly } : {}),
      ...(socialFeeOnly ? { socialFeeMonths } : {}),
    });
  } catch (error) {
    const response = buildCartQuoteErrorResponse(error);
    if (response) {
      return NextResponse.json(
        { error: response.message },
        { status: response.status }
      );
    }
    throw error;
  }

  if (items.length === 0 && quote.totalAmount <= 0) {
    return NextResponse.json(
      { error: 'No hay cuota social pendiente para pagar.' },
      { status: 400 }
    );
  }

  if (isManualPaymentMethod(paymentMethod)) {
    if (!proofFile) {
      return NextResponse.json(
        { error: 'No se recibió el comprobante.' },
        { status: 400 }
      );
    }

    try {
      const result = await createManualPaymentCheckout({
        user: {
          id: (
            session.user as {
              id: string;
              email?: string | null;
              name?: string | null;
            }
          ).id,
          email: session.user?.email ?? null,
          name: session.user?.name ?? null,
        },
        quote,
        proofFile,
      });

      if ('error' in result) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }

      return NextResponse.json({
        success: true,
        paymentId: result.payment.id,
        orderId: result.payment.orderId,
        redirectUrl: '/profile/payments?manual-payment=submitted',
      });
    } catch (error) {
      console.error('[checkout] Manual payment error:', error);
      return NextResponse.json(
        {
          error: 'No se pudo registrar el pago manual.',
        },
        { status: 500 }
      );
    }
  }

  const { accessToken, environment } = getMercadoPagoCredentials();
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Configuración de pago incompleta.' },
      { status: 500 }
    );
  }

  const client = new MercadoPagoConfig({ accessToken });
  const checkoutSettings = getMercadoPagoCheckoutSettings();
  const appUrl = getAppUrl(req);
  const base = `${appUrl}/activities/cart`;
  const refs = quote.validatedItems.map(
    (item) =>
      `${item.activityId}:${(session.user as { id: string }).id}:${
        item.target && item.target !== 'self' ? item.target : ''
      }:${item.groupId ?? ''}:${item.activityDayId ?? ''}`
  );

  const result = await new Preference(client).create({
    body: {
      items: toMercadoPagoItems(quote),
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
        userId: (session.user as { id: string }).id,
        environment,
        socialFeeAmount: quote.socialFeeAmount,
        familyDiscountAmount: quote.totalDiscountAmount,
        socialFeeParticipants: JSON.stringify(quote.socialFeeParticipants),
        socialFeePaymentLines: JSON.stringify(quote.socialFeePaymentLines),
      },
    },
  });

  return NextResponse.json({
    redirectUrl: result.init_point ?? result.sandbox_init_point,
  });
}
