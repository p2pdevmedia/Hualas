import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Box, Container, Heading, Text, Flex } from '@radix-ui/themes';
import { authOptions } from '@/lib/auth';
import { isCounterRole } from '@/lib/accounting';
import { prisma } from '@/lib/prisma';

const frequencyLabels: Record<
  'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONE_TIME',
  string
> = {
  DAILY: 'Diaria',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensual',
  ONE_TIME: 'Un solo pago',
};

export default async function MyActivitiesPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }
  if (isCounterRole(session.user.role)) {
    redirect('/accounting');
  }

  const userId = session.user.id;

  let participations: Array<{
    id: string;
    childId: string | null;
    child: { id: string; name: string; lastName: string | null } | null;
    activity: {
      id: string;
      name: string;
      date: Date;
      frequency: string;
      price: number;
    };
  }> = [];
  let professorAssignments: Array<{
    id: string;
    activity: {
      id: string;
      name: string;
      date: Date;
      frequency: string;
      price: number;
    };
  }> = [];

  try {
    [participations, professorAssignments] = await Promise.all([
      prisma.activityParticipant.findMany({
        where: {
          OR: [{ userId }, { child: { userId } }],
        },
        include: {
          activity: true,
          child: { select: { id: true, name: true, lastName: true } },
        },
        orderBy: { activity: { date: 'asc' } },
      }),
      prisma.activityProfessor.findMany({
        where: { userId },
        include: {
          activity: true,
        },
        orderBy: { activity: { date: 'asc' } },
      }),
    ]);
  } catch {
    participations = [];
    professorAssignments = [];
  }

  const grouped = new Map<
    string,
    {
      activity: (typeof participations)[number]['activity'];
      labels: Set<string>;
    }
  >();

  for (const p of participations) {
    const key = p.activity.id;
    const label = p.child
      ? `${p.child.name}${p.child.lastName ? ` ${p.child.lastName}` : ''}`
      : (session.user.name ?? 'Yo');
    const entry = grouped.get(key);
    if (entry) {
      entry.labels.add(label);
    } else {
      grouped.set(key, {
        activity: p.activity,
        labels: new Set([label]),
      });
    }
  }

  for (const assignment of professorAssignments) {
    const key = assignment.activity.id;
    const entry = grouped.get(key);
    if (entry) {
      entry.labels.add('Profesor');
    } else {
      grouped.set(key, {
        activity: assignment.activity,
        labels: new Set(['Profesor']),
      });
    }
  }

  const items = Array.from(grouped.values()).map((entry) => ({
    activity: entry.activity,
    labels: Array.from(entry.labels),
  }));

  return (
    <Container size="4" px={{ initial: '4', sm: '4' }} py="6">
      <Box asChild>
        <main>
          <Box className="mb-6">
            <Heading size="7" weight="medium" className="tracking-tight">
              Mis actividades
            </Heading>
            <Text size="2" color="gray">
              Actividades en las que estás inscripto vos, alguno de tus hijos o en
              las que sos profesor.
            </Text>
          </Box>

          {items.length === 0 ? (
            <Box className="py-16 text-center">
              <Text color="gray">Todavía no tenés actividades asociadas.</Text>
            </Box>
          ) : (
            <Box asChild>
              <ul className="space-y-3">
                {items.map(({ activity, labels }) => (
                  <Box
                    asChild
                    key={activity.id}
                    className="flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <li>
                      <Box>
                        <Link
                          href={`/activities/${activity.id}`}
                          className="text-base font-semibold transition-colors hover:text-primary"
                        >
                          {activity.name}
                        </Link>
                        <Flex gap="3" wrap="wrap" className="mt-1">
                          <Text size="2" color="gray">
                            {
                              frequencyLabels[
                                activity.frequency as keyof typeof frequencyLabels
                              ]
                            }
                          </Text>
                          <Text size="2" color="gray">·</Text>
                          <Text size="2" color="gray">${activity.price}</Text>
                          <Text size="2" color="gray">·</Text>
                          <Text size="2" color="gray">{labels.join(' · ')}</Text>
                        </Flex>
                      </Box>
                    </li>
                  </Box>
                ))}
              </ul>
            </Box>
          )}
        </main>
      </Box>
    </Container>
  );
}
