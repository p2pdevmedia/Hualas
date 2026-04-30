import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAccountingRole } from '@/lib/accounting';
import { approveManualPayment } from '@/lib/services/manual-payment-service';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await approveManualPayment({
    id: params.id,
    reviewer: {
      id: (session?.user as { id: string }).id,
      email: session?.user?.email ?? null,
      name: session?.user?.name ?? null,
    },
  });

  if ('error' in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json(result.payment);
}
