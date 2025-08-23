import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: { userId: session.user.id },
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
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
    })),
  }));

  return NextResponse.json(data);
}
