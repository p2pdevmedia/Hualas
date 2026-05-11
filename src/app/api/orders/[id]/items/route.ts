export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireLegacyAccountingAccess } from '@/lib/legacy-accounting-route';
import { orderService } from '@/lib/services/order-service';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const accessError = await requireLegacyAccountingAccess();
  if (accessError) return accessError;

  return NextResponse.json(
    await orderService.addOrderItem(params.id, await req.json())
  );
}
