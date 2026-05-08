import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAccountingRole } from '@/lib/accounting';
import { buildAccountingMovementReceiptUrl } from '@/lib/blob-urls';
import MovementForm from '../../movement-form';

export default async function EditMovementPage({
  params,
}: {
  params: { id: string };
}) {
  // Auth gating happens in the parent /accounting layout.
  await getServerSession(authOptions);

  const movement = await prisma.accountingMovement.findUnique({
    where: { id: params.id },
  });

  if (!movement) {
    redirect('/accounting/movements');
  }

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-2xl font-bold tracking-tight">
        Editar movimiento
      </h2>
      <MovementForm
        movement={{
          id: movement.id,
          date: movement.date.toISOString().split('T')[0],
          amount: movement.amount,
          type: movement.type,
          category: movement.category,
          description: movement.description,
          receiptNumber: movement.receiptNumber,
          receiptImage: movement.receiptImage
            ? buildAccountingMovementReceiptUrl(movement.id)
            : null,
        }}
      />
    </div>
  );
}
