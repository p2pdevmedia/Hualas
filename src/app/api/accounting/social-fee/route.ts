import { BillableConceptCode } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAccountingRole } from '@/lib/accounting';
import { prisma } from '@/lib/prisma';
import { normalizeSocialFeeAmount } from '@/lib/social-fee';

function parseAmount(value: unknown) {
  const amount = typeof value === 'string' ? Number(value) : Number(value);

  if (!Number.isInteger(amount) || amount < 0) {
    return null;
  }

  return amount;
}

async function ensureAccountingAccess() {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole(session?.user?.role)) {
    return null;
  }

  return session;
}

export async function GET() {
  const session = await ensureAccountingAccess();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const concept = await prisma.billableConcept.findUnique({
    where: { code: BillableConceptCode.SOCIAL_FEE },
    select: { defaultAmount: true, name: true, active: true },
  });

  return NextResponse.json({
    defaultAmount: normalizeSocialFeeAmount(concept?.defaultAmount ?? 0),
    name: concept?.name ?? 'Cuota social',
    active: concept?.active ?? false,
  });
}

export async function PATCH(req: Request) {
  const session = await ensureAccountingAccess();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const amount = parseAmount((body as { amount?: unknown } | null)?.amount);
  if (amount == null) {
    return NextResponse.json(
      { error: 'El monto debe ser un número entero mayor o igual a 0.' },
      { status: 400 }
    );
  }

  const concept = await prisma.billableConcept.upsert({
    where: { code: BillableConceptCode.SOCIAL_FEE },
    create: {
      code: BillableConceptCode.SOCIAL_FEE,
      name: 'Cuota social',
      defaultAmount: amount,
      active: true,
    },
    update: {
      defaultAmount: amount,
      active: true,
    },
    select: {
      defaultAmount: true,
      name: true,
      active: true,
    },
  });

  return NextResponse.json(concept);
}
