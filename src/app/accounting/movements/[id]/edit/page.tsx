import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Heading, Box, Container } from '@radix-ui/themes';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAccountingRole } from '@/lib/accounting';
import MovementForm from '../../movement-form';

export default async function EditMovementPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole(session?.user?.role)) {
    redirect('/');
  }

  const movement = await prisma.accountingMovement.findUnique({
    where: { id: params.id },
  });

  if (!movement) {
    redirect('/accounting/movements');
  }

  return (
    <Container>
      <Box className="rounded-2xl border bg-card p-6 shadow-sm">
        <Heading size="8" mb="4">
          Editar movimiento
        </Heading>
        <MovementForm
          movement={{
            id: movement.id,
            date: movement.date.toISOString().split('T')[0],
            amount: movement.amount,
            type: movement.type,
            category: movement.category,
            description: movement.description,
            receiptNumber: movement.receiptNumber,
            receiptImage: movement.receiptImage,
          }}
        />
      </Box>
    </Container>
  );
}
