import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Heading, Box, Container } from '@radix-ui/themes';
import { authOptions } from '@/lib/auth';
import { isAccountingRole } from '@/lib/accounting';
import MovementForm from '../movement-form';

export default async function NewMovementPage() {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole(session?.user?.role)) {
    redirect('/');
  }

  return (
    <Container>
      <Box className="rounded-2xl border bg-card p-6 shadow-sm">
        <Heading size="8" mb="4">
          Nuevo movimiento
        </Heading>
        <MovementForm />
      </Box>
    </Container>
  );
}
