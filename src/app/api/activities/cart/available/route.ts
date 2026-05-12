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
      groups: { select: { capacity: true } },
      _count: {
        select: {
          participants: { where: { status: 'ACTIVE' } },
        },
      },
    },
    orderBy: { date: 'asc' },
  });

  const available = activities
    .map((activity) => {
      const cap =
        activity.groups.length === 0 ||
        activity.groups.some((g) => g.capacity == null)
          ? null
          : activity.groups.reduce((sum, g) => sum + (g.capacity as number), 0);
      return { ...activity, cap };
    })
    .filter(
      (activity) =>
        activity.cap == null || activity._count.participants < activity.cap
    )
    .map((activity) => ({
      id: activity.id,
      name: activity.name,
      date: activity.date,
      price: activity.price,
      hasAvailability:
        activity.cap == null || activity._count.participants < activity.cap,
    }));

  return NextResponse.json({ activities: available });
}
