import { ACCOUNTING_ROLES } from '@/lib/accounting';
import { getParentChatContext } from '@/lib/chat/parent-chat-context';
import { formatFullName } from '@/lib/mobile-format';
import { prisma } from '@/lib/prisma';
import { familyGroupService } from '@/lib/services/family-group-service';

type UserSummary = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  profilePhoto: string | null;
  updatedAt: Date;
};

type FamilyGroupWithMembers = Awaited<
  ReturnType<typeof familyGroupService.getFamilyGroupsForUser>
>[number] & {
  responsibleUser: {
    id: string;
    name: string | null;
    lastName: string | null;
    email: string;
  } | null;
  members: Array<{
    memberId: string;
    relationship: string;
  }>;
};

export type MobileChatContact = {
  userId: string;
  label: string;
  subtitle: string;
  detailLine: string | null;
  profilePhoto: string | null;
  updatedAt: string;
  activityNames: string[];
};

export type MobileMemberChatContacts = {
  familyContacts: MobileChatContact[];
  professorContacts: MobileChatContact[];
  staffContacts: MobileChatContact[];
  allowedRecipientIds: string[];
};

function relationshipLabel(relationship: string) {
  switch (relationship) {
    case 'PARENT':
      return 'Madre / Padre';
    case 'RESPONSIBLE':
      return 'Responsable';
    case 'OTHER':
      return 'Tutor/a';
    case 'CHILD':
      return 'Hijo/a';
    default:
      return relationship;
  }
}

function contactSubtitle(user: UserSummary) {
  return user.email ?? user.phone ?? 'Sin contacto';
}

function buildContact(
  user: UserSummary,
  subtitle: string,
  detailLine: string | null = null,
  activityNames: string[] = []
): MobileChatContact {
  return {
    userId: user.id,
    label: formatFullName(user),
    subtitle,
    detailLine,
    profilePhoto: user.profilePhoto,
    updatedAt: user.updatedAt.toISOString(),
    activityNames,
  };
}

function sortByLabel(a: MobileChatContact, b: MobileChatContact) {
  return a.label.localeCompare(b.label, 'es');
}

function formatActivityRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const formatter = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
  });

  const startText = formatter.format(start);
  const endText = formatter.format(end);
  return start.toDateString() === end.toDateString()
    ? startText
    : `${startText} al ${endText}`;
}

function selectCurrentFamilyGroup(
  groups: FamilyGroupWithMembers[],
  userId: string
) {
  return (
    groups.find((group) => group.responsibleUserId === userId) ??
    groups[0] ??
    null
  );
}

export async function getMobileMemberChatContacts(
  userId: string
): Promise<MobileMemberChatContacts> {
  const [parentContext, familyGroups, staffUsers] = await Promise.all([
    getParentChatContext(userId),
    familyGroupService.getFamilyGroupsForUser(userId) as Promise<
      FamilyGroupWithMembers[]
    >,
    prisma.user.findMany({
      where: {
        id: { not: userId },
        isActive: true,
        role: { in: [...ACCOUNTING_ROLES] },
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        profilePhoto: true,
        updatedAt: true,
      },
      orderBy: [{ lastName: 'asc' }, { name: 'asc' }],
    }),
  ]);

  const familyGroup = selectCurrentFamilyGroup(familyGroups, userId);
  const familyContacts: MobileChatContact[] = [];
  const seenFamilyContactIds = new Set<string>();

  if (familyGroup) {
    const familyUserIds = new Set<string>();
    if (
      familyGroup.responsibleUserId &&
      familyGroup.responsibleUserId !== userId
    ) {
      familyUserIds.add(familyGroup.responsibleUserId);
    }

    for (const member of familyGroup.members) {
      if (member.memberId !== userId) {
        familyUserIds.add(member.memberId);
      }
    }

    const familyUsers = await prisma.user.findMany({
      where: {
        id: { in: Array.from(familyUserIds) },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        profilePhoto: true,
        updatedAt: true,
      },
      orderBy: [{ lastName: 'asc' }, { name: 'asc' }],
    });

    const familyUserMap = new Map<string, UserSummary>(
      familyUsers.map((user) => [user.id, user])
    );

    if (
      familyGroup.responsibleUserId &&
      familyGroup.responsibleUserId !== userId
    ) {
      const responsible = familyUserMap.get(familyGroup.responsibleUserId);
      if (responsible && !seenFamilyContactIds.has(responsible.id)) {
        familyContacts.push(
          buildContact(
            responsible,
            `Responsable principal · ${contactSubtitle(responsible)}`
          )
        );
        seenFamilyContactIds.add(responsible.id);
      }
    }

    for (const member of familyGroup.members) {
      if (member.memberId === userId) continue;
      const user = familyUserMap.get(member.memberId);
      if (!user || seenFamilyContactIds.has(user.id)) continue;
      familyContacts.push(
        buildContact(
          user,
          `${relationshipLabel(member.relationship)} · ${contactSubtitle(user)}`
        )
      );
      seenFamilyContactIds.add(user.id);
    }
  }

  const professorMap = new Map<
    string,
    MobileChatContact & {
      activityNameSet: Set<string>;
      detailLineSet: Set<string>;
    }
  >();

  for (const activity of parentContext.activities) {
    const participantNames = activity.participants.map(
      (participant) => participant.label
    );
    const detailSummary = [
      participantNames.length > 0
        ? participantNames.join(', ')
        : 'Sin participante',
      activity.name,
      formatActivityRange(activity.date, activity.endDate),
    ]
      .filter(Boolean)
      .join(' · ');

    for (const professor of activity.professors) {
      const existing = professorMap.get(professor.userId);
      if (existing) {
        existing.activityNameSet.add(activity.name);
        existing.detailLineSet.add(detailSummary);
        continue;
      }

      professorMap.set(professor.userId, {
        userId: professor.userId,
        label: professor.label,
        subtitle: professor.subtitle,
        detailLine: detailSummary,
        profilePhoto: professor.profilePhoto,
        updatedAt: professor.updatedAt,
        activityNames: [activity.name],
        activityNameSet: new Set([activity.name]),
        detailLineSet: new Set([detailSummary]),
      });
    }
  }

  const professorContacts = Array.from(professorMap.values())
    .map(({ activityNameSet, detailLineSet, ...contact }) => ({
      ...contact,
      activityNames: Array.from(activityNameSet).sort((a, b) =>
        a.localeCompare(b, 'es')
      ),
      detailLine: Array.from(detailLineSet).join(' · '),
    }))
    .sort(sortByLabel);

  const staffContacts = staffUsers.map((user) =>
    buildContact(
      user,
      user.email ?? user.phone ?? 'Administración / contaduría'
    )
  );

  const allowedRecipientIds = Array.from(
    new Set([
      ...familyContacts.map((contact) => contact.userId),
      ...professorContacts.map((contact) => contact.userId),
      ...staffContacts.map((contact) => contact.userId),
    ])
  );

  return {
    familyContacts: familyContacts.sort(sortByLabel),
    professorContacts,
    staffContacts: staffContacts.sort(sortByLabel),
    allowedRecipientIds,
  };
}
