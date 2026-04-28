export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { orderService } from '@/lib/services/order-service';

export async function POST(req: Request) {
  return NextResponse.json(await orderService.createDraftOrder(await req.json()));
}
