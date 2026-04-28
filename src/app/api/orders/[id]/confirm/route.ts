export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { orderService } from '@/lib/services/order-service';
export async function POST(_: Request, { params }: { params: { id: string } }) { return NextResponse.json(await orderService.confirmOrder(params.id)); }
