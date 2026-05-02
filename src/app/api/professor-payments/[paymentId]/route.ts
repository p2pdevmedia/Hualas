import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAccountingRole } from '@/lib/accounting';

const patchSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'CANCELLED']),
  paidAt: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { paymentId: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  if (!userId || !isAccountingRole(role)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.professorPayment.findUnique({
    where: { id: params.paymentId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
  }

  const paidAt =
    parsed.data.status === 'PAID'
      ? parsed.data.paidAt
        ? new Date(parsed.data.paidAt)
        : new Date()
      : null;

  const payment = await prisma.professorPayment.update({
    where: { id: params.paymentId },
    data: {
      status: parsed.data.status,
      paidAt,
      notes: parsed.data.notes ?? existing.notes,
    },
  });

  return NextResponse.json({ payment });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { paymentId: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  if (!userId || !isAccountingRole(role)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
  }

  const existing = await prisma.professorPayment.findUnique({
    where: { id: params.paymentId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
  }

  await prisma.professorPayment.delete({ where: { id: params.paymentId } });
  return NextResponse.json({ ok: true });
}
