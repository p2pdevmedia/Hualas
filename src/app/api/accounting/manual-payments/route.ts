import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAccountingRole } from '@/lib/accounting';
import { listManualPayments } from '@/lib/services/manual-payment-service';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');
  const limitParam = Number(searchParams.get('limit') ?? '50');
  const offsetParam = Number(searchParams.get('offset') ?? '0');

  const status =
    statusParam === 'PENDING' ||
    statusParam === 'APPROVED' ||
    statusParam === 'REJECTED' ||
    statusParam === 'CANCELLED'
      ? statusParam
      : null;

  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 100)
    : 50;
  const offset = Number.isFinite(offsetParam) ? Math.max(offsetParam, 0) : 0;

  const result = await listManualPayments({ status, limit, offset });

  return NextResponse.json({
    ...result,
    limit,
    offset,
  });
}
