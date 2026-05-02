export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { orderService } from '@/lib/services/order-service';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    await orderService.addOrderItem(params.id, await req.json())
  );
}
