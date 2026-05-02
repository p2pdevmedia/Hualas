import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAccountingRole } from '@/lib/accounting';

const updateSchema = z.object({
  monthlySalary: z.number().int().min(0),
  bankName: z.string().max(100).optional().nullable(),
  cbu: z.string().max(22).optional().nullable(),
  alias: z.string().max(50).optional().nullable(),
  cuit: z.string().max(13).optional().nullable(),
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
  const role = (session?.user as any)?.role;
  if (!userId || !isAccountingRole(role)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const professor = await prisma.user.findUnique({
    where: { id: params.id, role: 'PROFESSOR' },
    select: { id: true },
  });
  if (!professor) {
    return NextResponse.json(
      { error: 'Profesor no encontrado' },
      { status: 404 }
    );
  }

  const profile = await prisma.professorProfile.upsert({
    where: { userId: params.id },
    create: { userId: params.id, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ profile });
}
