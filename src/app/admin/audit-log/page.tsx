import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Heading, Text, Container } from '@radix-ui/themes';
import { authOptions } from '@/lib/auth';
import AuditLogTable from './audit-log-table';

export default async function AuditLogPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/');
  }

  return (
    <Container>
      <div className="py-8 space-y-4">
        <Heading size="8">Registro de auditoría</Heading>
        <Text size="2" color="gray">
          Historial de cambios en la base de datos. Solo visible para Super Admin.
        </Text>
        <AuditLogTable />
      </div>
    </Container>
  );
}
