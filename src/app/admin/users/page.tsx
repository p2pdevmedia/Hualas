import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Box, Heading, Container } from '@radix-ui/themes';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isCounterRole } from '@/lib/accounting';
import UsersList from './users-list';

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    if (isCounterRole(session?.user?.role)) {
      redirect('/accounting');
    }
    redirect('/');
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      dni: true,
      role: true,
      profilePhoto: true,
      updatedAt: true,
    },
  });
  return (
    <Container>
      <div className="py-8 space-y-4">
        <Heading size="8">Usuarios</Heading>
        <Box className="rounded-xl border bg-card p-6 shadow-sm">
          <UsersList users={users} />
        </Box>
      </div>
    </Container>
  );
}
