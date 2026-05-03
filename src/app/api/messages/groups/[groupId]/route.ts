import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyChatMessage } from '@/lib/notifications/notification-service';

export async function POST(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    content?: string;
  } | null;
  const content = body?.content?.trim();
  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  const group = await prisma.activityGroup.findUnique({
    where: { id: params.groupId },
    select: {
      id: true,
      activityId: true,
      activity: {
        select: {
          professors: {
            select: {
              userId: true,
            },
          },
        },
      },
      members: {
        select: {
          activityParticipant: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
  }

  const roles = ((session.user as any).roles as string[] | undefined) ?? [];
  const isAdmin =
    roles.includes('ADMIN') ||
    roles.includes('SUPER_ADMIN') ||
    session.user.role === 'ADMIN' ||
    session.user.role === 'SUPER_ADMIN';
  const isAssignedProfessor = group.activity.professors.some(
    (assignment) => assignment.userId === session.user.id
  );

  if (!isAdmin && !isAssignedProfessor) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const recipientIds = [
    ...new Set(
      group.members
        .map((member) => member.activityParticipant.userId)
        .filter((userId) => userId !== session.user.id)
    ),
  ];

  if (recipientIds.length === 0) {
    return NextResponse.json(
      { error: 'El grupo no tiene destinatarios' },
      { status: 400 }
    );
  }

  const createdMessages = await prisma.$transaction(async (tx) => {
    const messages = [];
    for (const recipientId of recipientIds) {
      let conversation = await tx.conversation.findFirst({
        where: {
          participants: { some: { userId: session.user.id } },
          AND: { participants: { some: { userId: recipientId } } },
        },
      });

      if (!conversation) {
        conversation = await tx.conversation.create({
          data: {
            participants: {
              create: [{ userId: session.user.id }, { userId: recipientId }],
            },
          },
        });
      }

      const message = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: session.user.id,
          body: content,
        },
      });

      messages.push(message);
    }
    return messages;
  });

  await Promise.all(
    createdMessages.map((message) =>
      notifyChatMessage(message.id).catch((error) =>
        console.error('[notifications] notifyChatMessage failed', error)
      )
    )
  );

  return NextResponse.json({
    sentCount: createdMessages.length,
    recipientCount: recipientIds.length,
  });
}
