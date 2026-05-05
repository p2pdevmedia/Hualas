import { prisma } from '@/lib/prisma';

export async function recipientsForActivityDay(
  dayId: string
): Promise<string[]> {
  const day = await prisma.activityDay.findUnique({
    where: { id: dayId },
    select: { activityId: true },
  });
  if (!day) return [];
  const participants = await prisma.activityParticipant.findMany({
    where: { activityId: day.activityId },
    select: { userId: true },
  });
  return [...new Set(participants.map((p) => p.userId))];
}

export async function recipientsForActivityDayUpdate(
  dayId: string
): Promise<string[]> {
  const day = await prisma.activityDay.findUnique({
    where: { id: dayId },
    select: { activityId: true, activityGroupId: true },
  });
  if (!day) return [];

  if (day.activityGroupId) {
    const [members, professors] = await Promise.all([
      prisma.activityGroupMember.findMany({
        where: { activityGroupId: day.activityGroupId },
        select: { activityParticipant: { select: { userId: true } } },
      }),
      prisma.activityDayProfessor.findMany({
        where: { activityDay: { activityGroupId: day.activityGroupId } },
        select: { userId: true },
      }),
    ]);

    return [
      ...new Set([
        ...members.map((m) => m.activityParticipant.userId),
        ...professors.map((p) => p.userId),
      ]),
    ];
  }

  const [participants, professors] = await Promise.all([
    prisma.activityParticipant.findMany({
      where: { activityId: day.activityId },
      select: { userId: true },
    }),
    prisma.activityProfessor.findMany({
      where: { activityId: day.activityId },
      select: { userId: true },
    }),
  ]);

  return [
    ...new Set([
      ...participants.map((p) => p.userId),
      ...professors.map((p) => p.userId),
    ]),
  ];
}

export async function recipientsForActivityDayCancellation(
  dayId: string
): Promise<string[]> {
  const day = await prisma.activityDay.findUnique({
    where: { id: dayId },
    select: { activityId: true, activityGroupId: true },
  });
  if (!day) return [];

  if (day.activityGroupId) {
    const [members, professors] = await Promise.all([
      prisma.activityGroupMember.findMany({
        where: { activityGroupId: day.activityGroupId },
        select: { activityParticipant: { select: { userId: true } } },
      }),
      prisma.activityDayProfessor.findMany({
        where: { activityDay: { activityGroupId: day.activityGroupId } },
        select: { userId: true },
      }),
    ]);
    return [
      ...new Set([
        ...members.map((m) => m.activityParticipant.userId),
        ...professors.map((p) => p.userId),
      ]),
    ];
  }

  const participants = await prisma.activityParticipant.findMany({
    where: { activityId: day.activityId },
    select: { userId: true },
  });
  return [...new Set(participants.map((p) => p.userId))];
}

export async function recipientsForPickupNotice(
  noticeId: string
): Promise<string[]> {
  const notice = await prisma.pickupNotice.findUnique({
    where: { id: noticeId },
    select: {
      alternatePersonUserId: true,
      activityDay: {
        select: {
          activityId: true,
          professors: { select: { userId: true } },
        },
      },
    },
  });
  if (!notice) return [];
  let professorIds = notice.activityDay.professors.map((p) => p.userId);
  if (professorIds.length === 0) {
    const activityProfs = await prisma.activityProfessor.findMany({
      where: { activityId: notice.activityDay.activityId },
      select: { userId: true },
    });
    professorIds = activityProfs.map((p) => p.userId);
  }
  const ids = new Set<string>(professorIds);
  if (notice.alternatePersonUserId) ids.add(notice.alternatePersonUserId);
  return [...ids];
}

export async function recipientsForPickupNoticeAcknowledged(
  ackId: string
): Promise<string[]> {
  const ack = await prisma.pickupNoticeAcknowledgment.findUnique({
    where: { id: ackId },
    select: { pickupNotice: { select: { createdById: true } } },
  });
  if (!ack) return [];
  return [ack.pickupNotice.createdById];
}

export async function recipientsForManualMovement(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ['COUNTER', 'ADMIN', 'SUPER_ADMIN'] },
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

export async function recipientsForOrderPayment(
  paymentId: string
): Promise<string[]> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { order: { select: { responsibleUserId: true } } },
  });
  const userId = payment?.order?.responsibleUserId;
  return userId ? [userId] : [];
}

export async function recipientsForActivityParticipant(
  participantId: string
): Promise<string[]> {
  const participant = await prisma.activityParticipant.findUnique({
    where: { id: participantId },
    select: { userId: true },
  });
  return participant ? [participant.userId] : [];
}

export async function recipientsForCapacityFull(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ['ADMIN', 'SUPER_ADMIN'] },
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

export type ChatMessageRecipients = {
  recipients: string[];
  senderId: string;
  conversationId: string;
};

export async function recipientsForChatMessage(
  messageId: string
): Promise<ChatMessageRecipients | null> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      senderId: true,
      conversationId: true,
      conversation: {
        select: { participants: { select: { userId: true } } },
      },
    },
  });
  if (!message) return null;
  const recipients = [
    ...new Set(
      message.conversation.participants
        .map((p) => p.userId)
        .filter((id) => id !== message.senderId)
    ),
  ];
  return {
    recipients,
    senderId: message.senderId,
    conversationId: message.conversationId,
  };
}
