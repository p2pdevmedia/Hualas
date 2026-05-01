import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  buildCartQuote,
  buildCartQuoteErrorResponse,
} from '@/lib/cart-checkout';

type CartItem = {
  activityId: string;
  target?: string;
  targetLabel?: string;
};

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

  try {
    const quote = await buildCartQuote({
      userId: (session.user as { id: string }).id,
      items,
    });

    return NextResponse.json({
      activityLines: quote.activityLines,
      discountLines: quote.discountLines,
      socialFeeLines: quote.socialFeeLines,
      totalActivityAmount: quote.totalActivityAmount,
      totalDiscountAmount: quote.totalDiscountAmount,
      totalSocialFeeAmount: quote.totalSocialFeeAmount,
      totalAmount: quote.totalAmount,
      socialFeeAmount: quote.socialFeeAmount,
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
