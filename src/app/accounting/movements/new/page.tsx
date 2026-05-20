import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import MovementForm from '../movement-form';

export default async function NewMovementPage() {
  // Auth gating happens in the parent /accounting layout.
  await getServerSession(authOptions);

  const activities = await prisma.activity.findMany({
    select: { id: true, name: true },
    orderBy: [{ endDate: 'desc' }, { name: 'asc' }],
  });

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-2xl font-bold tracking-tight">
        Nuevo movimiento
      </h2>
      <MovementForm activities={activities} />
    </div>
  );
}
