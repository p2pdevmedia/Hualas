import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { gateActiveRole } from '@/lib/role-guards';
import AddChildForm from '../add-child-form';

export default async function NewChildPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }
  const gate = gateActiveRole(session, 'MEMBER');
  if (gate) return gate;

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { address: true },
  });

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agregar hijo</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Completá los datos del menor que deseás registrar.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <AddChildForm userAddress={user.address ?? ''} />
      </div>

      <Link
        href="/profile/children"
        className="inline-block text-sm text-link hover:text-link/80 underline underline-offset-4"
      >
        ← Volver a mis hijos
      </Link>
    </div>
  );
}
