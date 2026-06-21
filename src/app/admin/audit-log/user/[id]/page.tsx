import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { gateSuperAdmin } from '@/lib/role-guards';
import { prisma } from '@/lib/prisma';
import AuditLogTable from '../../audit-log-table';

type PageProps = {
  params: {
    id: string;
  };
};

export default async function UserAuditLogPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const block = gateSuperAdmin(session);
  if (block) return block;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
    },
  });

  if (!user) {
    redirect('/admin/audit-log');
  }

  const label =
    [user.name, user.lastName].filter(Boolean).join(' ') || user.email;

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
      <div className="space-y-2">
        <Link
          href="/admin/audit-log"
          className="text-sm text-link hover:underline underline-offset-4"
        >
          ← Volver al registro general
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Auditoría de usuario
          </h1>
          <p className="text-sm text-muted-foreground">
            {label} · {user.id}
          </p>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <AuditLogTable
          initialUser={{
            id: user.id,
            label,
          }}
        />
      </div>
    </div>
  );
}
