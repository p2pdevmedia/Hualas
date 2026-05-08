import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { summarizeActivitySchedules } from '@/lib/activities/schedule-summary';
import { prisma } from '@/lib/prisma';
import StudentsSearch, {
  type ProfessorGroupEntry,
  type StudentEntry,
} from './students-search';

function calculateAge(birthDate: Date | null) {
  if (!birthDate) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function formatFullName(
  person: {
    name: string | null;
    lastName: string | null;
    email?: string;
  } | null
) {
  if (!person) return 'Sin nombre';
  return (
    [person.name, person.lastName].filter(Boolean).join(' ') ||
    person.email ||
    'Sin nombre'
  );
}

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

  const assignedGroupDays = await prisma.activityDay.findMany({
    where: {
      activityId: { in: activityIds },
      activityGroupId: { not: null },
      professors: { some: { userId: professorId } },
    },
    select: { activityGroupId: true },
    distinct: ['activityGroupId'],
  });

  const assignedGroupIds = assignedGroupDays
    .map((day) => day.activityGroupId)
    .filter((groupId): groupId is string => Boolean(groupId));

  const groupMembers = await prisma.activityGroupMember.findMany({
    where: {
      activityGroupId: { in: assignedGroupIds },
    },
    include: {
      activityGroup: { select: { name: true } },
      activityParticipant: {
        include: {
          activity: { select: { name: true } },
          attendances: {
            orderBy: { activityDay: { date: 'desc' } },
            select: {
              status: true,
              confirmedAt: true,
              activityDay: {
                select: {
                  date: true,
                  schedule: true,
                  cancelled: true,
                  activityGroup: { select: { name: true } },
                },
              },
            },
          },
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

  const activityGroups = await prisma.activityGroup.findMany({
    where: { id: { in: assignedGroupIds } },
    orderBy: [{ activity: { name: 'asc' } }, { name: 'asc' }],
    include: {
      activity: { select: { name: true, activityType: true } },
      days: {
        orderBy: { date: 'asc' },
        select: {
          id: true,
          date: true,
          schedule: true,
          cancelled: true,
          professors: {
            select: {
              userId: true,
              user: {
                select: {
                  name: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          attendances: {
            select: {
              activityParticipantId: true,
              status: true,
            },
          },
        },
      },
      members: {
        orderBy: { createdAt: 'asc' },
        include: {
          activityParticipant: {
            include: {
              user: {
                select: {
                  name: true,
                  lastName: true,
                  email: true,
                  birthDate: true,
                },
              },
              child: {
                select: {
                  name: true,
                  lastName: true,
                  birthDate: true,
                },
              },
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
      history: StudentEntry['history'];
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
      history: StudentEntry['history'];
    }
  >();

  function buildParticipantHistory(gm: (typeof groupMembers)[number]) {
    const participant = gm.activityParticipant;

    return {
      participantId: participant.id,
      activityName: participant.activity.name,
      groupName: gm.activityGroup.name,
      registeredAt: gm.createdAt.toISOString(),
      attendances: participant.attendances.map((attendance) => ({
        date: attendance.activityDay.date.toISOString(),
        schedule: attendance.activityDay.schedule,
        status: attendance.status,
        confirmedAt: attendance.confirmedAt?.toISOString() ?? null,
        cancelled: attendance.activityDay.cancelled,
        groupName: attendance.activityDay.activityGroup?.name ?? null,
      })),
    };
  }

  for (const gm of groupMembers) {
    const ap = gm.activityParticipant;
    const activityName = ap.activity.name;
    const historyEntry = buildParticipantHistory(gm);

    if (ap.child) {
      const existing = childrenMap.get(ap.child.id);
      if (existing) {
        existing.activitiesSet.add(activityName);
        existing.history.push(historyEntry);
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
          history: [historyEntry],
        });
      }
    } else {
      const existing = adultsMap.get(ap.user.id);
      if (existing) {
        existing.activitiesSet.add(activityName);
        existing.history.push(historyEntry);
      } else {
        adultsMap.set(ap.user.id, {
          userId: ap.user.id,
          name: ap.user.name ?? '',
          lastName: ap.user.lastName,
          phone: ap.user.phone,
          email: ap.user.email,
          dni: ap.user.dni,
          activitiesSet: new Set([activityName]),
          history: [historyEntry],
        });
      }
    }
  }

  // Fetch tutors for children's parents and adult participants
  const responsibleIds = Array.from(
    new Set([
      ...Array.from(childrenMap.values()).map((c) => c.parentId),
      ...Array.from(adultsMap.keys()),
    ])
  );
  const familyGroups =
    responsibleIds.length > 0
      ? await prisma.familyGroup.findMany({
          where: { responsibleUserId: { in: responsibleIds } },
          select: {
            responsibleUserId: true,
            members: {
              include: {
                member: {
                  select: {
                    name: true,
                    lastName: true,
                    phone: true,
                    email: true,
                  },
                },
              },
            },
          },
        })
      : [];

  type TutorEntry = {
    name: string;
    phone: string | null;
    email: string;
    relationship: string;
  };
  const tutorsByResponsible = new Map<string, TutorEntry[]>();
  for (const group of familyGroups) {
    if (!group.responsibleUserId) continue;
    tutorsByResponsible.set(
      group.responsibleUserId,
      group.members.map((m) => ({
        name:
          [m.member.name, m.member.lastName].filter(Boolean).join(' ') ||
          m.member.email,
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
        history: c.history,
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
        history: u.history,
      })
    ),
  ].sort((a, b) => {
    const nameA = `${a.name} ${a.lastName ?? ''}`.trim().toLowerCase();
    const nameB = `${b.name} ${b.lastName ?? ''}`.trim().toLowerCase();
    return nameA.localeCompare(nameB, 'es');
  });

  const groups: ProfessorGroupEntry[] = activityGroups.map((group) => {
    const professorsById = new Map<
      string,
      {
        userId: string;
        name: string;
        email: string;
        phone: string | null;
        sessionCount: number;
      }
    >();

    const attendanceSummaryByParticipantId = new Map<
      string,
      { attended: number; missed: number }
    >();

    for (const day of group.days) {
      for (const attendance of day.attendances) {
        if (
          attendance.status !== 'GOING' &&
          attendance.status !== 'NOT_GOING'
        ) {
          continue;
        }

        const summary = attendanceSummaryByParticipantId.get(
          attendance.activityParticipantId
        ) ?? { attended: 0, missed: 0 };

        if (attendance.status === 'GOING') {
          summary.attended += 1;
        } else {
          summary.missed += 1;
        }

        attendanceSummaryByParticipantId.set(
          attendance.activityParticipantId,
          summary
        );
      }

      for (const professor of day.professors) {
        const existing = professorsById.get(professor.userId);
        if (existing) {
          existing.sessionCount += 1;
          continue;
        }

        professorsById.set(professor.userId, {
          userId: professor.userId,
          name: formatFullName(professor.user),
          email: professor.user.email,
          phone: professor.user.phone,
          sessionCount: 1,
        });
      }
    }

    return {
      id: group.id,
      name: group.name,
      activityName: group.activity.name,
      description: group.description,
      capacity: group.capacity,
      minAge: group.minAge,
      maxAge: group.maxAge,
      professors: Array.from(professorsById.values()).sort((a, b) =>
        a.name.localeCompare(b.name, 'es')
      ),
      schedules: summarizeActivitySchedules(
        group.activity.activityType,
        group.days
      ).map((day) => ({
        id: day.id,
        date: day.date.toISOString(),
        weekday: day.weekday,
        schedule: day.schedule,
        cancelled: day.cancelled,
        repeatsWeekly: day.repeatsWeekly,
      })),
      participants: group.members
        .map((member) => {
          const participant = member.activityParticipant;

          if (participant.child) {
            return {
              id: member.id,
              type: 'child' as const,
              name: formatFullName(participant.child),
              age: calculateAge(participant.child.birthDate),
              responsibleName: formatFullName(participant.user),
              attendanceSummary: attendanceSummaryByParticipantId.get(
                participant.id
              ) ?? {
                attended: 0,
                missed: 0,
              },
            };
          }

          return {
            id: member.id,
            type: 'adult' as const,
            name: formatFullName(participant.user),
            age: calculateAge(participant.user.birthDate),
            responsibleName: null,
            attendanceSummary: attendanceSummaryByParticipantId.get(
              participant.id
            ) ?? {
              attended: 0,
              missed: 0,
            },
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    };
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mis alumnos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Alumnos y padres en los grupos que tenés asignados.
        </p>
      </div>
      <StudentsSearch students={students} groups={groups} />
    </main>
  );
}
