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

  let quote;
  try {
    quote = await buildCartQuote({
      userId: (session.user as { id: string }).id,
      items,
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
  const refs = items.map(
    (item) =>
      `${item.activityId}:${(session.user as { id: string }).id}:${item.target && item.target !== 'self' ? item.target : ''}`
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
        socialFeeParticipants: JSON.stringify(quote.socialFeeParticipants),
      },
    },
  });

  return NextResponse.json({
    redirectUrl: result.init_point ?? result.sandbox_init_point,
  });
}
