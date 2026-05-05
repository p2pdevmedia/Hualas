import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: { userId },
      },
    },
    select: {
      id: true,
      participants: {
        select: {
          user: {
            select: { id: true, name: true },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
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
              senderId: { not: userId },
              readAt: null,
            },
          },
        },
      },
    },
  });

  const data = conversations.map((c) => ({
    id: c.id,
    participants: c.participants.map((p) => ({
      id: p.user.id,
      name: p.user.name,
    })),
    messages: c.messages.map((m) => ({
      from: m.senderId,
      content: m.body,
      createdAt: m.createdAt.toISOString(),
      readAt: m.readAt?.toISOString() ?? null,
    })),
    unreadCount: c._count.messages,
  }));

  return NextResponse.json(data);
}
