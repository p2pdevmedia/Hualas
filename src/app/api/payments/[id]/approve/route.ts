export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireLegacyAccountingAccess } from '@/lib/legacy-accounting-route';
import { paymentService } from '@/lib/services/payment-service';
export async function POST(_: Request, { params }: { params: { id: string } }) {
  const accessError = await requireLegacyAccountingAccess();
  if (accessError) return accessError;

  return NextResponse.json(await paymentService.approvePayment(params.id));
}
