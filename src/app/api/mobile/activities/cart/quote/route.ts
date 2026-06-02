import { NextResponse } from 'next/server';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import {
  buildCartQuote,
  buildCartQuoteErrorResponse,
} from '@/lib/cart-checkout';

type CartItem = {
  activityId: string;
  target?: string;
  targetLabel?: string;
  groupId?: string;
  activityDayId?: string;
  activityDayLabel?: string;
};

export async function POST(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.appRole !== 'MEMBER') {
    return NextResponse.json(
      { error: 'Solo los socios pueden cotizar actividades.' },
      { status: 403 }
    );
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
  const socialFeeOnly =
    (payload as { socialFeeOnly?: unknown } | null)?.socialFeeOnly === true;
  const socialFeeMonths = Number(
    (payload as { socialFeeMonths?: unknown } | null)?.socialFeeMonths ?? 1
  );

  try {
    const quote = await buildCartQuote({
      userId: session.userId,
      items,
      ...(socialFeeOnly ? { socialFeeOnly } : {}),
      ...(socialFeeOnly ? { socialFeeMonths } : {}),
    });

    return NextResponse.json({
      activityLines: quote.activityLines,
      discountLines: quote.discountLines,
      socialFeeLines: quote.socialFeeLines,
      mercadoPagoFeeLines: quote.mercadoPagoFeeLines,
      totalActivityAmount: quote.totalActivityAmount,
      totalDiscountAmount: quote.totalDiscountAmount,
      totalSocialFeeAmount: quote.totalSocialFeeAmount,
      totalMercadoPagoFeeAmount: quote.totalMercadoPagoFeeAmount,
      totalAmount: quote.totalAmount,
      totalAmountWithMercadoPagoFee: quote.totalAmountWithMercadoPagoFee,
      socialFeeAmount: quote.socialFeeAmount,
      socialFeeMonths: quote.socialFeeMonths,
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
}
