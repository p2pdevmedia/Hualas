import { NextResponse } from 'next/server';
import { formatFullName } from '@/lib/mobile-format';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: { userId: session.userId },
      },
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
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          senderId: true,
          body: true,
          createdAt: true,
          readAt: true,
        },
      },
      _count: {
        select: {
          messages: {
            where: {
              senderId: { not: session.userId },
              readAt: null,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({
    conversations: conversations.map((conversation) => {
      const peerParticipants = conversation.participants
        .map((participant) => participant.user)
        .filter((user) => user.id !== session.userId);

      const peer = peerParticipants[0] ?? conversation.participants[0]?.user;
      const latestMessage = conversation.messages[0] ?? null;

      return {
        id: conversation.id,
        peer: peer
          ? {
              id: peer.id,
              name: peer.name,
              lastName: peer.lastName,
              email: peer.email,
              phone: peer.phone,
              role: peer.role,
              profilePhoto: peer.profilePhoto,
            }
          : null,
        title: peer ? formatFullName(peer) : 'Chat',
        subtitle: peer?.email ?? peer?.phone ?? null,
        lastMessage: latestMessage
          ? {
              id: latestMessage.id,
              from: latestMessage.senderId,
              content: latestMessage.body,
              createdAt: latestMessage.createdAt.toISOString(),
              readAt: latestMessage.readAt?.toISOString() ?? null,
            }
          : null,
        unreadCount: conversation._count.messages,
      };
    }),
  });
}
