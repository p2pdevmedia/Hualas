import { NextResponse } from 'next/server';
import { paymentService } from '@/lib/services/payment-service';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  return NextResponse.json(await paymentService.createPaymentForOrder(params.id, body.amount, body.provider));
}
