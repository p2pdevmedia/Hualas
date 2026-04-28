import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import AuditLogTable from './audit-log-table';

export default async function AuditLogPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/');
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">
        Registro de auditoría
      </h1>
      <p className="text-sm text-muted-foreground">
        Historial de cambios en la base de datos. Solo visible para Super Admin.
      </p>
      <AuditLogTable />
    </div>
  );
}
