import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Box, Flex, Text, Container } from '@radix-ui/themes';
import { Button } from '@/components/ui/button';
import ActivitiesHeading from '@/components/activities-heading';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function ActivitiesPage() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    redirect('/');
  }

  let activities: any[] = [];

  try {
    activities = await prisma.activity.findMany({
      include: { participants: true },
      orderBy: { date: 'asc' },
    });
  } catch (e: any) {
    activities = [];
  }

  const frequencyLabels: Record<
    'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONE_TIME',
    string
  > = {
    DAILY: 'Diaria',
    WEEKLY: 'Semanal',
    MONTHLY: 'Mensual',
    ONE_TIME: 'Un solo pago',
  };

  return (
    <main className="py-6">
      <Container>
        <Flex direction="column" gap="6">
          <Flex
            justify="between"
            align="start"
            gap="2"
            className="flex-col sm:flex-row sm:items-center"
          >
            <ActivitiesHeading />
            <Link href="/activities/new">
              <Button>Crear actividad</Button>
            </Link>
          </Flex>

          {activities.length === 0 ? (
            <Box className="py-16 text-center">
              <Text color="gray">No hay actividades creadas.</Text>
            </Box>
          ) : (
            <Box className="space-y-3">
              {activities.map((activity) => (
                <Box
                  key={activity.id}
                  className="rounded-xl border bg-card p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <Box>
                    <Link
                      href={`/activities/${activity.id}`}
                      className="text-base font-semibold hover:text-primary transition-colors"
                    >
                      {activity.name}
                    </Link>
                    <Flex gap="3" className="mt-1 flex-wrap">
                      <Text size="2" color="gray">
                        {
                          frequencyLabels[
                            activity.frequency as keyof typeof frequencyLabels
                          ]
                        }
                      </Text>
                      <Text size="2" color="gray">
                        ·
                      </Text>
                      <Text size="2" color="gray">
                        ${activity.price}
                      </Text>
                      <Text size="2" color="gray">
                        ·
                      </Text>
                      <Text size="2" color="gray">
                        {activity.capacity
                          ? `${Math.max(activity.capacity - activity.participants.length, 0)} cupos restantes`
                          : `${activity.participants.length} suscriptos`}
                      </Text>
                    </Flex>
                  </Box>
                  <Flex gap="2" className="flex-wrap sm:justify-end">
                    <Link
                      href={`/activities/${activity.id}`}
                      className="inline-flex items-center justify-center rounded-full border-[1.5px] border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                    >
                      Ver
                    </Link>
                    <Link
                      href={`/activities/${activity.id}/edit`}
                      className="inline-flex items-center justify-center rounded-full border-[1.5px] border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                    >
                      Editar
                    </Link>
                  </Flex>
                </Box>
              ))}
            </Box>
          )}
        </Flex>
      </Container>
    </main>
  );
}
