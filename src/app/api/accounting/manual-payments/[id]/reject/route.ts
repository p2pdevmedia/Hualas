import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAccountingRole } from '@/lib/accounting';
import { rejectManualPayment } from '@/lib/services/manual-payment-service';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { comment?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const result = await rejectManualPayment({
    id: params.id,
    reviewer: {
      id: (session?.user as { id: string }).id,
      email: session?.user?.email ?? null,
      name: session?.user?.name ?? null,
    },
    comment: body.comment,
  });

  if ('error' in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json(result.payment);
}
