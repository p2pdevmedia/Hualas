import { prisma } from '@/lib/prisma';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';

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

type RawProfessor = {
  activityId: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    profilePhoto: string | null;
    updatedAt: Date;
  };
};

export type ParentChatPerson = {
  userId: string;
  label: string;
  subtitle: string;
  activityParticipantId: string;
};

export type ParentChatGroup = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  members: ParentChatPerson[];
};

export type ParentChatActivity = {
  id: string;
  name: string;
  description: string | null;
  date: string;
  endDate: string;
  participants: ParentChatPerson[];
  groups: ParentChatGroup[];
  professors: {
    userId: string;
    label: string;
    subtitle: string;
    profilePhoto: string | null;
    updatedAt: string;
  }[];
};

export type ParentSharedContact = {
  userId: string;
  label: string;
  subtitle: string;
  activityCount: number;
  activities: string[];
  profilePhoto: string | null;
  updatedAt: string;
};

export type ParentChatContext = {
  activities: ParentChatActivity[];
  sharedParticipants: ParentSharedContact[];
};

function fullName(parts: { name: string | null; lastName: string | null }) {
  return [parts.name, parts.lastName].filter(Boolean).join(' ') || 'Sin nombre';
}

function buildParticipantSummary(
  participant: RawParticipant
): ParentChatPerson {
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

export async function getParentChatContext(
  userId: string
): Promise<ParentChatContext> {
  const ownerIds = await getAccessibleChildOwnerIds(userId);

  const participants = await prisma.activityParticipant.findMany({
    where: {
      OR: [
        { userId: { in: ownerIds } },
        { child: { userId: { in: ownerIds } } },
      ],
    },
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
  });

  if (participants.length === 0) {
    return { activities: [], sharedParticipants: [] };
  }

  const activityIds = Array.from(
    new Set(participants.map((participant) => participant.activityId))
  );

  const [activities, groups, professors] = await Promise.all([
    prisma.activity.findMany({
      where: { id: { in: activityIds } },
      select: {
        id: true,
        name: true,
        description: true,
        date: true,
        endDate: true,
      },
      orderBy: { date: 'asc' },
    }),
    prisma.activityGroup.findMany({
      where: { activityId: { in: activityIds } },
      select: {
        id: true,
        activityId: true,
        name: true,
        description: true,
        members: { select: { activityParticipantId: true } },
      },
      orderBy: [{ activityId: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.activityProfessor.findMany({
      where: { activityId: { in: activityIds } },
      select: {
        activityId: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            phone: true,
            profilePhoto: true,
            updatedAt: true,
          },
        },
      },
    }),
  ]);

  const participantById = new Map<string, RawParticipant>();
  const activitiesById = new Map<
    string,
    ParentChatActivity & {
      participantMap: Map<string, ParentChatPerson>;
      groupMap: Map<string, ParentChatGroup>;
      professorMap: Map<string, ParentChatActivity['professors'][number]>;
    }
  >(
    activities.map((activity) => [
      activity.id,
      {
        id: activity.id,
        name: activity.name,
        description: activity.description,
        date: activity.date.toISOString(),
        endDate: activity.endDate.toISOString(),
        participants: [],
        groups: [],
        professors: [],
        participantMap: new Map<string, ParentChatPerson>(),
        groupMap: new Map<string, ParentChatGroup>(),
        professorMap: new Map(),
      },
    ])
  );

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
    if (!activity) continue;

    const summary = buildParticipantSummary(participant);
    if (!activity.participantMap.has(summary.userId)) {
      activity.participantMap.set(summary.userId, summary);
    }

    const existing = sharedByUser.get(participant.userId);
    if (existing) {
      existing.activityIds.add(participant.activityId);
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
    if (!activity) continue;

    const memberMap = new Map<string, ParentChatPerson>();
    for (const member of group.members) {
      const participant = participantById.get(member.activityParticipantId);
      if (!participant) continue;
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

  for (const professor of professors as RawProfessor[]) {
    const activity = activitiesById.get(professor.activityId);
    if (!activity) continue;

    if (!activity.professorMap.has(professor.userId)) {
      activity.professorMap.set(professor.userId, {
        userId: professor.userId,
        label: fullName(professor.user),
        subtitle:
          professor.user.email ??
          professor.user.phone ??
          'Sin datos de contacto',
        profilePhoto: professor.user.profilePhoto,
        updatedAt: professor.user.updatedAt.toISOString(),
      });
    }
  }

  const activitiesWithContacts = Array.from(activitiesById.values()).map(
    ({ participantMap, groupMap, professorMap, ...activity }) => ({
      ...activity,
      participants: Array.from(participantMap.values()).sort((a, b) =>
        a.label.localeCompare(b.label, 'es')
      ),
      groups: Array.from(groupMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name, 'es')
      ),
      professors: Array.from(professorMap.values()).sort((a, b) =>
        a.label.localeCompare(b.label, 'es')
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
    activities: activitiesWithContacts,
    sharedParticipants,
  };
}
