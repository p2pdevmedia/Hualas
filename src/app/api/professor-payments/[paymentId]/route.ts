import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAccountingRole } from '@/lib/accounting';
import {
  notifyProfessorPaymentCancelled,
  notifyProfessorPaymentPaid,
} from '@/lib/notifications/notification-service';

const patchSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'CANCELLED']),
  paidAt: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

const paymentInclude = {
  createdBy: { select: { id: true, name: true, lastName: true } },
  invoice: {
    select: {
      id: true,
      status: true,
      approvedAt: true,
      transferredAt: true,
    },
  },
};

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
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
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
  const invoiceStatus =
    parsed.data.status === 'PAID'
      ? 'TRANSFERRED'
      : parsed.data.status === 'PENDING'
        ? 'APPROVED'
        : 'PENDING';

  const payment = await prisma.$transaction(async (tx) => {
    const updated = await tx.professorPayment.update({
      where: { id: params.paymentId },
      data: {
        status: parsed.data.status,
        paidAt,
        notes: parsed.data.notes ?? existing.notes,
      },
      include: paymentInclude,
    });

    if (existing.invoiceId) {
      await tx.professorInvoice.update({
        where: { id: existing.invoiceId },
        data: {
          status: invoiceStatus,
          transferredAt: parsed.data.status === 'PAID' ? paidAt : null,
          approvedAt:
            parsed.data.status === 'CANCELLED'
              ? null
              : (updated.invoice?.approvedAt ?? new Date()),
        },
      });
    }

    return updated.invoice
      ? { ...updated, invoice: { ...updated.invoice, status: invoiceStatus } }
      : updated;
  });

  if (parsed.data.status === 'PAID' && existing.status !== 'PAID') {
    await notifyProfessorPaymentPaid(params.paymentId);
  } else if (
    parsed.data.status === 'CANCELLED' &&
    existing.status !== 'CANCELLED'
  ) {
    await notifyProfessorPaymentCancelled(params.paymentId);
  }

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

  await prisma.$transaction(async (tx) => {
    await tx.professorPayment.delete({ where: { id: params.paymentId } });

    if (existing.invoiceId) {
      await tx.professorInvoice.update({
        where: { id: existing.invoiceId },
        data: {
          status: 'PENDING',
          approvedAt: null,
          transferredAt: null,
        },
      });
    }
  });
  return NextResponse.json({ ok: true });
}
