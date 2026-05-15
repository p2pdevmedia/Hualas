import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAccountingRole } from '@/lib/accounting';

const bankingDataSchema = z.object({
  bankName: z.string().max(100).optional().nullable(),
  cbu: z.string().max(22).optional().nullable(),
  alias: z.string().max(50).optional().nullable(),
  cuit: z.string().max(13).optional().nullable(),
});

const accountingUpdateSchema = bankingDataSchema.extend({
  monthlySalary: z.number().int().min(0),
  notes: z.string().max(500).optional().nullable(),
});

function cleanBankingData(data: z.infer<typeof bankingDataSchema>) {
  return {
    bankName: data.bankName?.trim() || null,
    cbu: data.cbu?.trim() || null,
    alias: data.alias?.trim() || null,
    cuit: data.cuit?.trim() || null,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const role =
    (session?.user as any)?.activeRole ?? (session?.user as any)?.role;
  if (!userId)
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const isProfessorSelf = role === 'PROFESSOR' && userId === params.id;
  const isAccounting = isAccountingRole(role);
  if (!isProfessorSelf && !isAccounting) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
  }

  const profile = await prisma.professorProfile.findUnique({
    where: { userId: params.id },
    include: {
      user: { select: { id: true, name: true, lastName: true, email: true } },
      payments: {
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
        include: {
          createdBy: { select: { name: true, lastName: true } },
        },
      },
    },
  });

  return NextResponse.json({ profile });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const role =
    (session?.user as any)?.activeRole ?? (session?.user as any)?.role;
  const isProfessorSelf = role === 'PROFESSOR' && userId === params.id;
  const isAccounting = isAccountingRole(role);

  if (!userId || (!isAccounting && !isProfessorSelf)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  const professor = await prisma.user.findFirst({
    where: {
      id: params.id,
      roleAssignments: { some: { role: 'PROFESSOR' } },
    },
    select: { id: true },
  });
  if (!professor) {
    return NextResponse.json(
      { error: 'Profesor no encontrado' },
      { status: 404 }
    );
  }

  if (isAccounting) {
    const parsed = accountingUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const bankingData = cleanBankingData(parsed.data);
    const profile = await prisma.professorProfile.upsert({
      where: { userId: params.id },
      create: {
        userId: params.id,
        ...bankingData,
        monthlySalary: parsed.data.monthlySalary,
        notes: parsed.data.notes?.trim() || null,
      },
      update: {
        ...bankingData,
        monthlySalary: parsed.data.monthlySalary,
        notes: parsed.data.notes?.trim() || null,
      },
    });

    return NextResponse.json({ profile });
  }

  const parsed = bankingDataSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const profile = await prisma.professorProfile.upsert({
    where: { userId: params.id },
    create: {
      userId: params.id,
      ...cleanBankingData(parsed.data),
    },
    update: cleanBankingData(parsed.data),
  });

  return NextResponse.json({ profile });
}
