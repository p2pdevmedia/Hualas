export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireLegacyAccountingAccess } from '@/lib/legacy-accounting-route';
import { orderService } from '@/lib/services/order-service';

export async function POST(req: Request) {
  const accessError = await requireLegacyAccountingAccess();
  if (accessError) return accessError;

  return NextResponse.json(
    await orderService.createDraftOrder(await req.json())
  );
}
