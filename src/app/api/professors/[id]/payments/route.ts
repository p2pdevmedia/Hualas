import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAccountingRole } from '@/lib/accounting';

const createSchema = z.object({
  periodMonth: z.number().int().min(1).max(12),
  periodYear: z.number().int().min(2020).max(2100),
  amount: z.number().int().min(1),
  notes: z.string().max(500).optional().nullable(),
});

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
    include: { createdBy: { select: { name: true, lastName: true } } },
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

  const payment = await prisma.professorPayment.create({
    data: {
      professorProfileId: profile.id,
      periodMonth: parsed.data.periodMonth,
      periodYear: parsed.data.periodYear,
      amount: parsed.data.amount,
      notes: parsed.data.notes ?? null,
      createdById: userId,
    },
  });

  return NextResponse.json({ payment }, { status: 201 });
}
