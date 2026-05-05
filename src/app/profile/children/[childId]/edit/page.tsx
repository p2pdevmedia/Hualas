import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ChildEditForm from './form';
import { gateActiveRole } from '@/lib/role-guards';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';

export default async function EditChildPage({
  params,
}: {
  params: { childId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }
  const gate = gateActiveRole(session, 'MEMBER');
  if (gate) return gate;

  const child = await prisma.child.findFirst({
    where: {
      id: params.childId,
      userId: { in: await getAccessibleChildOwnerIds((session.user as any).id) },
    },
    include: { user: true },
  });

  if (!child) {
    redirect('/profile/children');
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Editar {child.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Actualizá los datos de tu hijo/a
          </p>
        </div>
        <Link
          href={`/profile/children/${params.childId}`}
          className="inline-block text-sm text-link hover:text-link/80 underline underline-offset-4"
        >
          ← Volver
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <ChildEditForm child={child} />
      </div>
    </div>
  );
}
