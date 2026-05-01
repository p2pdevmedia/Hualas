import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { name, icon, defaultDescription, sortOrder, isActive } = await req.json();
  if (!name?.trim() || !icon?.trim()) {
    return NextResponse.json({ error: 'Nombre e ícono son requeridos' }, { status: 400 });
  }
  const type = await prisma.activityDayType.update({
    where: { id: params.id },
    data: {
      name: name.trim(),
      icon: icon.trim(),
      defaultDescription: defaultDescription?.trim() || null,
      sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    },
  });
  return NextResponse.json(type);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await prisma.activityDayType.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
