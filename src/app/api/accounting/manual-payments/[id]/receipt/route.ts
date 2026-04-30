import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAccountingRole } from '@/lib/accounting';

async function streamManualPaymentReceipt(id: string) {
  const payment = await prisma.payment.findFirst({
    where: {
      id,
      provider: 'MANUAL_TRANSFER',
    },
    select: {
      receiptUrl: true,
    },
  });

  if (!payment?.receiptUrl) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const blob = await get(payment.receiptUrl, { access: 'private' });
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return new NextResponse(null, { status: 404 });
    }

    const headers = Object.fromEntries(blob.headers.entries());
    headers['Cache-Control'] = 'private, no-store, max-age=0';

    return new NextResponse(blob.stream, { headers });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payment = await prisma.payment.findFirst({
    where: {
      id: params.id,
      provider: 'MANUAL_TRANSFER',
    },
    select: {
      order: {
        select: {
          responsibleUserId: true,
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!isAccountingRole(role) && payment.order.responsibleUserId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return streamManualPaymentReceipt(params.id);
}
