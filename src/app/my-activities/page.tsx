import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
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
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Mis actividades
        </h1>
        <p className="text-sm text-muted-foreground">
          Actividades en las que estás inscripto vos, alguno de tus hijos o en
          las que sos profesor.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <p>Todavía no tenés actividades asociadas.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map(({ activity, labels }) => (
            <li
              key={activity.id}
              className="flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link
                  href={`/activities/${activity.id}`}
                  className="text-base font-semibold transition-colors hover:text-primary"
                >
                  {activity.name}
                </Link>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span>
                    {
                      frequencyLabels[
                        activity.frequency as keyof typeof frequencyLabels
                      ]
                    }
                  </span>
                  <span>·</span>
                  <span>${activity.price}</span>
                  <span>·</span>
                  <span>{labels.join(' · ')}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
