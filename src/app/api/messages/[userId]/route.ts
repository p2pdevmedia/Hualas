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
    .map((m) => ({
      from: m.senderId,
      content: m.body,
      createdAt: m.createdAt.toISOString(),
    }));

  return NextResponse.json(messages);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const otherUserId = params.userId;
  if (otherUserId === session.user.id) {
    return NextResponse.json(
      { error: 'Cannot message yourself' },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => null)) as {
    content?: string;
  } | null;
  const content = body?.content?.trim();
  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  const recipient = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: { id: true, role: true },
  });
  if (!recipient) {
    return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
  }

  const senderRole = session.user.role;
  const isSenderAdmin = senderRole === 'ADMIN' || senderRole === 'SUPER_ADMIN';
  const isRecipientAdmin =
    recipient.role === 'ADMIN' || recipient.role === 'SUPER_ADMIN';
  if (!isSenderAdmin && !isRecipientAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let conversation = await prisma.conversation.findFirst({
    where: {
      participants: { some: { userId: session.user.id } },
      AND: { participants: { some: { userId: otherUserId } } },
    },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId: session.user.id }, { userId: otherUserId }],
        },
      },
    });
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: session.user.id,
      body: content,
    },
  });

  return NextResponse.json({
    from: message.senderId,
    content: message.body,
    createdAt: message.createdAt.toISOString(),
  });
}
