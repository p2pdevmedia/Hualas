import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import StudentsSearch, { type StudentEntry } from './students-search';

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
              dni: true,
            },
          },
          child: {
            select: {
              id: true,
              name: true,
              lastName: true,
              birthDate: true,
              documentNumber: true,
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
      documentNumber: string | null;
      parentId: string;
      parentName: string;
      parentPhone: string | null;
      parentEmail: string;
      parentDni: string | null;
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
      dni: string | null;
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
          documentNumber: ap.child.documentNumber,
          parentId: ap.user.id,
          parentName:
            `${ap.user.name ?? ''} ${ap.user.lastName ?? ''}`.trim() ||
            'Sin nombre',
          parentPhone: ap.user.phone,
          parentEmail: ap.user.email,
          parentDni: ap.user.dni,
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
          dni: ap.user.dni,
          activitiesSet: new Set([activityName]),
        });
      }
    }
  }

  // Fetch tutors for children's parents and adult participants
  const responsibleIds = Array.from(new Set([
    ...Array.from(childrenMap.values()).map((c) => c.parentId),
    ...Array.from(adultsMap.keys()),
  ]));
  const familyGroups = responsibleIds.length > 0
    ? await prisma.familyGroup.findMany({
        where: { responsibleUserId: { in: responsibleIds } },
        select: {
          responsibleUserId: true,
          members: {
            include: {
              member: {
                select: { name: true, lastName: true, phone: true, email: true },
              },
            },
          },
        },
      })
    : [];

  type TutorEntry = { name: string; phone: string | null; email: string; relationship: string };
  const tutorsByResponsible = new Map<string, TutorEntry[]>();
  for (const group of familyGroups) {
    if (!group.responsibleUserId) continue;
    tutorsByResponsible.set(
      group.responsibleUserId,
      group.members.map((m) => ({
        name: [m.member.name, m.member.lastName].filter(Boolean).join(' ') || m.member.email,
        phone: m.member.phone ?? null,
        email: m.member.email,
        relationship: m.relationship,
      }))
    );
  }

  const students: StudentEntry[] = [
    ...Array.from(childrenMap.values()).map(
      (c): StudentEntry => ({
        type: 'child',
        childId: c.childId,
        name: c.name,
        lastName: c.lastName,
        birthDate: c.birthDate?.toISOString() ?? null,
        documentNumber: c.documentNumber,
        parentId: c.parentId,
        parentName: c.parentName,
        parentPhone: c.parentPhone,
        parentEmail: c.parentEmail,
        parentDni: c.parentDni,
        tutors: tutorsByResponsible.get(c.parentId) ?? [],
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
        dni: u.dni,
        tutors: tutorsByResponsible.get(u.userId) ?? [],
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
      <StudentsSearch students={students} />
    </main>
  );
}
