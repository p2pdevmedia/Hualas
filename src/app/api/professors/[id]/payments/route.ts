import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAccountingRole } from '@/lib/accounting';

const createSchema = z.object({
  invoiceId: z.string().min(1),
  periodMonth: z.number().int().min(1).max(12),
  periodYear: z.number().int().min(2020).max(2100),
  amount: z.number().int().min(1),
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

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  if (!userId)
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const isProfessorSelf = role === 'PROFESSOR' && userId === params.id;
  const isAccounting = isAccountingRole(role);
  if (!isProfessorSelf && !isAccounting) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
  }

  const profile = await prisma.professorProfile.findUnique({
    where: { userId: params.id },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ payments: [] });

  const payments = await prisma.professorPayment.findMany({
    where: { professorProfileId: profile.id },
    orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    include: paymentInclude,
  });

  return NextResponse.json({ payments });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  if (!userId || !isAccountingRole(role)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const profile = await prisma.professorProfile.findUnique({
    where: { userId: params.id },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json(
      { error: 'El profesor no tiene perfil configurado' },
      { status: 400 }
    );
  }

  const invoice = await prisma.professorInvoice.findUnique({
    where: { id: parsed.data.invoiceId },
    select: { id: true, professorId: true, status: true },
  });

  if (!invoice || invoice.professorId !== params.id) {
    return NextResponse.json(
      { error: 'Factura no encontrada para este profesor' },
      { status: 404 }
    );
  }

  if (invoice.status !== 'PENDING') {
    return NextResponse.json(
      { error: 'La factura ya fue aprobada o transferida' },
      { status: 409 }
    );
  }

  try {
    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.professorPayment.create({
        data: {
          professorProfileId: profile.id,
          invoiceId: invoice.id,
          periodMonth: parsed.data.periodMonth,
          periodYear: parsed.data.periodYear,
          amount: parsed.data.amount,
          status: 'PENDING',
          notes: parsed.data.notes ?? null,
          createdById: userId,
        },
        include: paymentInclude,
      });

      await tx.professorInvoice.update({
        where: { id: invoice.id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          transferredAt: null,
        },
      });

      return created.invoice
        ? { ...created, invoice: { ...created.invoice, status: 'APPROVED' } }
        : created;
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (err) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      err.code === 'P2002'
    ) {
      return NextResponse.json(
        {
          error:
            'Ya existe un pago registrado para ese profesor en ese período.',
        },
        { status: 409 }
      );
    }

    throw err;
  }
}
