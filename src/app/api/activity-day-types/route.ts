import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const types = await prisma.activityDayType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  return NextResponse.json(types);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { name, icon, defaultDescription, sortOrder } = await req.json();
  if (!name?.trim() || !icon?.trim()) {
    return NextResponse.json({ error: 'Nombre e ícono son requeridos' }, { status: 400 });
  }
  const type = await prisma.activityDayType.create({
    data: {
      name: name.trim(),
      icon: icon.trim(),
      defaultDescription: defaultDescription?.trim() || null,
      sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
    },
  });
  return NextResponse.json(type);
}
