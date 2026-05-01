import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type CartItem = {
  activityId: string;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const items = Array.isArray((payload as { items?: unknown } | null)?.items)
    ? ((payload as { items: CartItem[] }).items ?? [])
    : [];

  const excludedIds = new Set(items.map((item) => item.activityId));

  const activities = await prisma.activity.findMany({
    where: {
      id: { notIn: [...excludedIds] },
    },
    select: {
      id: true,
      name: true,
      date: true,
      price: true,
      capacity: true,
      _count: {
        select: { participants: true },
      },
    },
    orderBy: { date: 'asc' },
  });

  const available = activities
    .filter(
      (activity) =>
        activity.capacity == null || activity._count.participants < activity.capacity
    )
    .map((activity) => ({
      id: activity.id,
      name: activity.name,
      date: activity.date,
      price: activity.price,
      hasAvailability:
        activity.capacity == null || activity._count.participants < activity.capacity,
    }));

  return NextResponse.json({ activities: available });
}
