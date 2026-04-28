import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Heading, Text, Box, Container } from '@radix-ui/themes';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/');
  }

  const notifications = await prisma.mercadoPagoNotification.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <Container>
      <Box className="py-8 space-y-4">
        <Heading size="8">Notificaciones</Heading>
        {notifications.length === 0 && (
          <Text size="2" color="gray">
            No hay notificaciones.
          </Text>
        )}
        <Box className="space-y-3">
          {notifications.map((n) => (
            <Box
              key={n.id}
              className="rounded-xl border bg-card p-4 shadow-sm space-y-2"
            >
              <Text size="2" color="gray" weight="medium">
                {n.topic}
              </Text>
              <pre className="overflow-x-auto text-xs bg-muted p-3 rounded-md">
                {JSON.stringify(n.data, null, 2)}
              </pre>
              <Text size="1" color="gray">
                {n.createdAt.toISOString()}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Container>
  );
}
