import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const otherUserId = params.userId;

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: { userId: session.user.id },
      },
      AND: {
        participants: {
          some: { userId: otherUserId },
        },
      },
    },
    include: {
      messages: true,
    },
  });

  const messages = conversations
    .flatMap((c) => c.messages)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((m) => ({ from: m.senderId, content: m.body }));

  return NextResponse.json(messages);
}
