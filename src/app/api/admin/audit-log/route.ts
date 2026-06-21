import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasSuperAdminCapability } from '@/lib/roles';

const PAGE_SIZE = 25;

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as JsonRecord;
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getSearchTokens(value: string | null): string[] {
  return Array.from(
    new Set(
      (value ?? '')
        .trim()
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean)
    )
  );
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!hasSuperAdminCapability(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const model = getString(searchParams.get('model'));
  const action = getString(searchParams.get('action'));
  const user = getString(searchParams.get('user'));
  const userId = getString(searchParams.get('userId'));
  const userTokens = getSearchTokens(user);

  const matchedUserIds = userTokens.length
    ? (
        await prisma.user.findMany({
          where: {
            AND: userTokens.map((token) => ({
              OR: [
                { name: { contains: token, mode: 'insensitive' } },
                { lastName: { contains: token, mode: 'insensitive' } },
                { email: { contains: token, mode: 'insensitive' } },
              ],
            })),
          },
          select: { id: true },
        })
      ).map((matchedUser) => matchedUser.id)
    : [];

  const where: Prisma.DbAuditLogWhereInput = {
    AND: [
      ...(model
        ? [{ model: { contains: model, mode: Prisma.QueryMode.insensitive } }]
        : []),
      ...(action
        ? [
            {
              action: {
                contains: action,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ]
        : []),
      ...(userId
        ? [
            {
              OR: [{ userId }, { model: 'User', recordId: userId }],
            },
          ]
        : []),
      ...(userTokens.length
        ? [
            {
              OR: [
                { userId: { in: matchedUserIds } },
                {
                  model: 'User',
                  recordId: { in: matchedUserIds },
                },
              ],
            },
          ]
        : []),
    ],
  };

  const [logs, total] = await Promise.all([
    prisma.dbAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.dbAuditLog.count({ where }),
  ]);

  const userIds = new Set<string>();
  const activityIds = new Set<string>();
  const conversationIds = new Set<string>();

  for (const log of logs) {
    if (log.userId) {
      userIds.add(log.userId);
    }

    if (
      log.model === 'User' &&
      (log.action === 'create' || log.action === 'update') &&
      log.recordId
    ) {
      userIds.add(log.recordId);
    }

    if (
      log.model === 'Activity' &&
      (log.action === 'create' || log.action === 'update') &&
      log.recordId
    ) {
      activityIds.add(log.recordId);
    }

    const after = asRecord(log.after);
    const args = asRecord(log.args);
    const argsData = asRecord(args?.data);

    const senderId =
      getString(after?.senderId) ?? getString(argsData?.senderId) ?? null;
    if (senderId) {
      userIds.add(senderId);
    }

    const conversationId =
      getString(after?.conversationId) ??
      getString(argsData?.conversationId) ??
      null;
    if (conversationId) {
      conversationIds.add(conversationId);
    }
  }

  const [users, activities, conversations] = await Promise.all([
    userIds.size
      ? prisma.user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: { id: true, name: true, lastName: true, email: true },
        })
      : Promise.resolve([]),
    activityIds.size
      ? prisma.activity.findMany({
          where: { id: { in: Array.from(activityIds) } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    conversationIds.size
      ? prisma.conversation.findMany({
          where: { id: { in: Array.from(conversationIds) } },
          select: {
            id: true,
            participants: {
              select: {
                userId: true,
                user: {
                  select: { id: true, name: true, lastName: true, email: true },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const usersById = Object.fromEntries(
    users.map((user) => {
      const displayName = [user.name, user.lastName].filter(Boolean).join(' ');
      return [user.id, displayName || user.email];
    })
  );

  const activitiesById = Object.fromEntries(
    activities.map((activity) => [activity.id, activity.name])
  );

  const conversationParticipantsById = Object.fromEntries(
    conversations.map((conversation) => [
      conversation.id,
      conversation.participants.map((participant) => ({
        userId: participant.userId,
        name:
          [participant.user.name, participant.user.lastName]
            .filter(Boolean)
            .join(' ') || participant.user.email,
      })),
    ])
  );

  return NextResponse.json({
    logs,
    total,
    page,
    pageSize: PAGE_SIZE,
    lookups: {
      usersById,
      activitiesById,
      conversationParticipantsById,
    },
  });
}
