export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { paymentService } from '@/lib/services/payment-service';
export async function POST(_: Request, { params }: { params: { id: string } }) {
  return NextResponse.json(await paymentService.rejectPayment(params.id));
}
