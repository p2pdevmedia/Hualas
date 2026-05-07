import { NextResponse } from 'next/server';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { formatFullName } from '@/lib/mobile-format';
import { prisma } from '@/lib/prisma';
import { notifyChatMessage } from '@/lib/notifications/notification-service';

async function sharedActivityBetweenUsers(senderId: string, recipientId: string) {
  const [senderParticipantActivities, senderProfessorActivities, recipientParticipantActivities, recipientProfessorActivities] =
    await Promise.all([
      prisma.activityParticipant.findMany({
        where: { userId: senderId },
        select: { activityId: true },
      }),
      prisma.activityProfessor.findMany({
        where: { userId: senderId },
        select: { activityId: true },
      }),
      prisma.activityParticipant.findMany({
        where: { userId: recipientId },
        select: { activityId: true },
      }),
      prisma.activityProfessor.findMany({
        where: { userId: recipientId },
        select: { activityId: true },
      }),
    ]);

  const senderActivities = new Set([
    ...senderParticipantActivities.map((item) => item.activityId),
    ...senderProfessorActivities.map((item) => item.activityId),
  ]);
  const recipientActivities = new Set([
    ...recipientParticipantActivities.map((item) => item.activityId),
    ...recipientProfessorActivities.map((item) => item.activityId),
  ]);

  for (const activityId of senderActivities) {
    if (recipientActivities.has(activityId)) {
      return true;
    }
  }

  return false;
}

async function canMessageUser(senderId: string, recipientId: string) {
  if (senderId === recipientId) return false;
  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true, isActive: true, role: true },
  });
  if (!recipient || !recipient.isActive) return false;
  return sharedActivityBetweenUsers(senderId, recipientId);
}

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const otherUserId = params.userId;
  const allowed = await canMessageUser(session.userId, otherUserId);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      participants: { some: { userId: session.userId } },
      AND: { participants: { some: { userId: otherUserId } } },
    },
    select: {
      id: true,
      participants: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
              phone: true,
              role: true,
              profilePhoto: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          senderId: true,
          body: true,
          createdAt: true,
          readAt: true,
        },
      },
    },
  });

  if (!conversation) {
    const recipient = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        profilePhoto: true,
      },
    });

    return NextResponse.json({
      conversationId: null,
      peer: recipient
        ? {
            id: recipient.id,
            name: recipient.name,
            lastName: recipient.lastName,
            email: recipient.email,
            phone: recipient.phone,
            role: recipient.role,
            profilePhoto: recipient.profilePhoto,
            label: formatFullName(recipient),
          }
        : null,
      messages: [],
    });
  }

  await prisma.message.updateMany({
    where: {
      readAt: null,
      senderId: otherUserId,
      conversationId: conversation.id,
    },
    data: {
      readAt: new Date(),
    },
  });

  const peer = conversation.participants
    .map((participant) => participant.user)
    .find((user) => user.id !== session.userId) ??
    conversation.participants[0]?.user ??
    null;

  return NextResponse.json({
    conversationId: conversation.id,
    peer: peer
      ? {
          id: peer.id,
          name: peer.name,
          lastName: peer.lastName,
          email: peer.email,
          phone: peer.phone,
          role: peer.role,
          profilePhoto: peer.profilePhoto,
          label: formatFullName(peer),
        }
      : null,
    messages: conversation.messages.map((message) => ({
      id: message.id,
      from: message.senderId,
      content: message.body,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const otherUserId = params.userId;
  const allowed = await canMessageUser(session.userId, otherUserId);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    content?: string;
  } | null;
  const content = body?.content?.trim();
  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  let conversation = await prisma.conversation.findFirst({
    where: {
      participants: { some: { userId: session.userId } },
      AND: { participants: { some: { userId: otherUserId } } },
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId: session.userId }, { userId: otherUserId }],
        },
      },
    });
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: session.userId,
      body: content,
    },
  });

  notifyChatMessage(message.id).catch((error) =>
    console.error('[notifications] notifyChatMessage failed', error)
  );

  return NextResponse.json({
    id: message.id,
    from: message.senderId,
    content: message.body,
    createdAt: message.createdAt.toISOString(),
    readAt: message.readAt?.toISOString() ?? null,
  });
}
