import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isAccountingRole } from '@/lib/accounting';
import MovementForm from '../movement-form';

export default async function NewMovementPage() {
  // Auth gating happens in the parent /accounting layout.
  await getServerSession(authOptions);

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-2xl font-bold tracking-tight">
        Nuevo movimiento
      </h2>
      <MovementForm />
    </div>
  );
}
