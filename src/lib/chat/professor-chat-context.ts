import { prisma } from '@/lib/prisma';

type RawParticipant = {
  id: string;
  activityId: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    lastName: string | null;
    email: string | null;
  };
  child: {
    id: string;
    name: string;
    lastName: string | null;
  } | null;
};

type RawGroup = {
  id: string;
  activityId: string;
  name: string;
  description: string | null;
  members: { activityParticipantId: string }[];
};

export type ProfessorChatPerson = {
  userId: string;
  label: string;
  subtitle: string;
  activityParticipantId: string;
};

export type ProfessorChatGroup = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  members: ProfessorChatPerson[];
};

export type ProfessorChatActivity = {
  id: string;
  name: string;
  description: string | null;
  date: string;
  endDate: string;
  participants: ProfessorChatPerson[];
  groups: ProfessorChatGroup[];
};

export type SharedParticipant = {
  userId: string;
  label: string;
  subtitle: string;
  activityCount: number;
  activities: string[];
};

export type ProfessorChatContext = {
  activities: ProfessorChatActivity[];
  sharedParticipants: SharedParticipant[];
};

function fullName(parts: {
  name: string | null;
  lastName: string | null;
}): string {
  return [parts.name, parts.lastName].filter(Boolean).join(' ') || 'Sin nombre';
}

function buildParticipantSummary(
  participant: RawParticipant
): ProfessorChatPerson {
  if (participant.child) {
    return {
      userId: participant.userId,
      label: fullName(participant.child),
      subtitle: `Registrado por ${fullName(participant.user)}`,
      activityParticipantId: participant.id,
    };
  }

  return {
    userId: participant.userId,
    label: fullName(participant.user),
    subtitle: participant.user.email ?? 'Sin correo',
    activityParticipantId: participant.id,
  };
}

export async function getProfessorChatContext(
  professorId: string
): Promise<ProfessorChatContext> {
  const assignments = await prisma.activityProfessor.findMany({
    where: { userId: professorId },
    select: {
      activity: {
        select: {
          id: true,
          name: true,
          description: true,
          date: true,
          endDate: true,
        },
      },
    },
    orderBy: { activity: { date: 'asc' } },
  });

  if (assignments.length === 0) {
    return {
      activities: [],
      sharedParticipants: [],
    };
  }

  const activityIds = assignments.map((assignment) => assignment.activity.id);
  const activitiesById = new Map<
    string,
    ProfessorChatActivity & {
      participantMap: Map<string, ProfessorChatPerson>;
      groupMap: Map<string, ProfessorChatGroup>;
    }
  >(
    assignments.map((assignment) => [
      assignment.activity.id,
      {
        id: assignment.activity.id,
        name: assignment.activity.name,
        description: assignment.activity.description,
        date: assignment.activity.date.toISOString(),
        endDate: assignment.activity.endDate.toISOString(),
        participants: [],
        groups: [],
        participantMap: new Map<string, ProfessorChatPerson>(),
        groupMap: new Map<string, ProfessorChatGroup>(),
      },
    ])
  );

  const [participants, groups] = await Promise.all([
    prisma.activityParticipant.findMany({
      where: { activityId: { in: activityIds } },
      select: {
        id: true,
        activityId: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        child: {
          select: {
            id: true,
            name: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.activityGroup.findMany({
      where: { activityId: { in: activityIds } },
      select: {
        id: true,
        activityId: true,
        name: true,
        description: true,
        members: {
          select: {
            activityParticipantId: true,
          },
        },
      },
      orderBy: [{ activityId: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  const participantById = new Map<string, RawParticipant>();
  const sharedByUser = new Map<
    string,
    {
      userId: string;
      label: string;
      subtitle: string;
      activityIds: Set<string>;
    }
  >();

  for (const participant of participants as RawParticipant[]) {
    participantById.set(participant.id, participant);

    const activity = activitiesById.get(participant.activityId);
    if (!activity) {
      continue;
    }

    const summary = buildParticipantSummary(participant);

    if (!activity.participantMap.has(summary.userId)) {
      activity.participantMap.set(summary.userId, summary);
    }

    const shared = sharedByUser.get(participant.userId);
    if (shared) {
      shared.activityIds.add(participant.activityId);
    } else {
      sharedByUser.set(participant.userId, {
        userId: participant.userId,
        label: summary.label,
        subtitle: summary.subtitle,
        activityIds: new Set([participant.activityId]),
      });
    }
  }

  for (const group of groups as RawGroup[]) {
    const activity = activitiesById.get(group.activityId);
    if (!activity) {
      continue;
    }

    const memberMap = new Map<string, ProfessorChatPerson>();
    for (const member of group.members) {
      const participant = participantById.get(member.activityParticipantId);
      if (!participant) {
        continue;
      }

      const summary = buildParticipantSummary(participant);
      if (!memberMap.has(summary.userId)) {
        memberMap.set(summary.userId, summary);
      }
    }

    activity.groupMap.set(group.id, {
      id: group.id,
      name: group.name,
      description: group.description,
      memberCount: memberMap.size,
      members: Array.from(memberMap.values()),
    });
  }

  const activities = Array.from(activitiesById.values()).map(
    ({ participantMap, groupMap, ...activity }) => ({
      ...activity,
      participants: Array.from(participantMap.values()).sort((a, b) =>
        a.label.localeCompare(b.label, 'es')
      ),
      groups: Array.from(groupMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name, 'es')
      ),
    })
  );

  const sharedParticipants = Array.from(sharedByUser.values())
    .filter((participant) => participant.activityIds.size > 1)
    .map((participant) => ({
      userId: participant.userId,
      label: participant.label,
      subtitle: participant.subtitle,
      activityCount: participant.activityIds.size,
      activities: Array.from(participant.activityIds)
        .map((activityId) => activitiesById.get(activityId)?.name ?? '')
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'es')),
    }))
    .sort((a, b) => {
      if (b.activityCount !== a.activityCount) {
        return b.activityCount - a.activityCount;
      }
      return a.label.localeCompare(b.label, 'es');
    });

  return {
    activities,
    sharedParticipants,
  };
}
