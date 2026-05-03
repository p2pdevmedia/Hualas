import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import NewForm from '../new-form';

export default async function NewFormPage() {
  const session = await getServerSession(authOptions);
  // Auth gating happens in the parent /admin layout.
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Nuevo formulario</h1>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <NewForm />
      </div>
    </div>
  );
}
