import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type StudentEntry =
  | {
      type: 'child';
      childId: string;
      name: string;
      lastName: string | null;
      birthDate: Date | null;
      parentId: string;
      parentName: string;
      parentPhone: string | null;
      activities: string[];
    }
  | {
      type: 'adult';
      userId: string;
      name: string;
      lastName: string | null;
      phone: string | null;
      email: string;
      activities: string[];
    };

export default async function ProfessorStudentsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const activeRole = session.user.activeRole ?? session.user.role;
  if (activeRole !== 'PROFESSOR') redirect('/my-activities');

  const professorId = session.user.id;

  const professorActivities = await prisma.activityProfessor.findMany({
    where: { userId: professorId },
    select: { activityId: true },
  });

  const activityIds = professorActivities.map((a) => a.activityId);

  if (activityIds.length === 0) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Mis alumnos</h1>
        <p className="text-sm text-muted-foreground">
          No tenés actividades asignadas todavía.
        </p>
      </main>
    );
  }

  const groupMembers = await prisma.activityGroupMember.findMany({
    where: {
      activityGroup: { activityId: { in: activityIds } },
    },
    include: {
      activityGroup: { select: { name: true } },
      activityParticipant: {
        include: {
          activity: { select: { name: true } },
          user: {
            select: {
              id: true,
              name: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
          child: {
            select: {
              id: true,
              name: true,
              lastName: true,
              birthDate: true,
            },
          },
        },
      },
    },
  });

  const childrenMap = new Map<
    string,
    {
      childId: string;
      name: string;
      lastName: string | null;
      birthDate: Date | null;
      parentId: string;
      parentName: string;
      parentPhone: string | null;
      activitiesSet: Set<string>;
    }
  >();

  const adultsMap = new Map<
    string,
    {
      userId: string;
      name: string;
      lastName: string | null;
      phone: string | null;
      email: string;
      activitiesSet: Set<string>;
    }
  >();

  for (const gm of groupMembers) {
    const ap = gm.activityParticipant;
    const activityName = ap.activity.name;

    if (ap.child) {
      const existing = childrenMap.get(ap.child.id);
      if (existing) {
        existing.activitiesSet.add(activityName);
      } else {
        childrenMap.set(ap.child.id, {
          childId: ap.child.id,
          name: ap.child.name,
          lastName: ap.child.lastName,
          birthDate: ap.child.birthDate,
          parentId: ap.user.id,
          parentName:
            `${ap.user.name ?? ''} ${ap.user.lastName ?? ''}`.trim() ||
            'Sin nombre',
          parentPhone: ap.user.phone,
          activitiesSet: new Set([activityName]),
        });
      }
    } else {
      const existing = adultsMap.get(ap.user.id);
      if (existing) {
        existing.activitiesSet.add(activityName);
      } else {
        adultsMap.set(ap.user.id, {
          userId: ap.user.id,
          name: ap.user.name ?? '',
          lastName: ap.user.lastName,
          phone: ap.user.phone,
          email: ap.user.email,
          activitiesSet: new Set([activityName]),
        });
      }
    }
  }

  const students: StudentEntry[] = [
    ...Array.from(childrenMap.values()).map(
      (c): StudentEntry => ({
        type: 'child',
        childId: c.childId,
        name: c.name,
        lastName: c.lastName,
        birthDate: c.birthDate,
        parentId: c.parentId,
        parentName: c.parentName,
        parentPhone: c.parentPhone,
        activities: Array.from(c.activitiesSet),
      })
    ),
    ...Array.from(adultsMap.values()).map(
      (u): StudentEntry => ({
        type: 'adult',
        userId: u.userId,
        name: u.name,
        lastName: u.lastName,
        phone: u.phone,
        email: u.email,
        activities: Array.from(u.activitiesSet),
      })
    ),
  ].sort((a, b) => {
    const nameA = `${a.name} ${a.lastName ?? ''}`.trim().toLowerCase();
    const nameB = `${b.name} ${b.lastName ?? ''}`.trim().toLowerCase();
    return nameA.localeCompare(nameB, 'es');
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mis alumnos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Alumnos y padres en grupos de tus actividades.
        </p>
      </div>

      {students.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          <p>Todavía no hay alumnos asignados a grupos en tus actividades.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {students.map((student) => {
            const fullName =
              `${student.name} ${student.lastName ?? ''}`.trim() || 'Sin nombre';
            const href =
              student.type === 'child'
                ? `/professor/students/child/${student.childId}`
                : `/professor/students/parent/${student.userId}`;

            return (
              <li key={student.type === 'child' ? student.childId : student.userId}>
                <Link
                  href={href}
                  className="flex items-start justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{fullName}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                          student.type === 'child'
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {student.type === 'child' ? 'Alumno' : 'Adulto'}
                      </span>
                    </div>

                    {student.type === 'child' && (
                      <p className="text-sm text-muted-foreground">
                        Padre/madre:{' '}
                        <span className="font-medium text-foreground">
                          {student.parentName}
                        </span>
                        {student.parentPhone && ` · ${student.parentPhone}`}
                      </p>
                    )}

                    {student.type === 'adult' && student.phone && (
                      <p className="text-sm text-muted-foreground">
                        {student.phone}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 mt-1">
                      {student.activities.map((act) => (
                        <span
                          key={act}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>

                  {student.type === 'child' && student.birthDate && (
                    <span className="shrink-0 text-xs text-muted-foreground mt-1">
                      {student.birthDate.toLocaleDateString('es-AR')}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
