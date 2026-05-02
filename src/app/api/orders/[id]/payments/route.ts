export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { paymentService } from '@/lib/services/payment-service';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const amount = Number(body.amount);

  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  return NextResponse.json(
    await paymentService.createPaymentForOrder(
      params.id,
      Math.round(amount * 100),
      body.provider
    )
  );
}
