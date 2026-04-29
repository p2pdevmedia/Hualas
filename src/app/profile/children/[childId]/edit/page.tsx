import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ChildEditForm from './form';

export default async function EditChildPage({
  params,
}: {
  params: { childId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  const child = await prisma.child.findUnique({
    where: { id: params.childId },
    include: { user: true },
  });

  if (!child || child.userId !== (session.user as any).id) {
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
            Actualiza los datos de tu hijo
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
