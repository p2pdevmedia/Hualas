import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const PAGE_SIZE = 25;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function collectUserIdsFromLog(log: {
  userId: string | null;
  recordId: string | null;
  model: string;
  before: Prisma.JsonValue | null;
  after: Prisma.JsonValue | null;
  args: Prisma.JsonValue | null;
}) {
  const userIds = new Set<string>();

  if (log.userId) {
    userIds.add(log.userId);
  }

  if (log.model === 'User' && log.recordId) {
    userIds.add(log.recordId);
  }

  const after = asRecord(log.after);
  const before = asRecord(log.before);
  const args = asRecord(log.args);
  const argsData = asRecord(args?.data);
  const argsWhere = asRecord(args?.where);

  const candidateValues = [
    after?.senderId,
    after?.receiverId,
    after?.authorId,
    after?.fromUserId,
    after?.toUserId,
    before?.senderId,
    before?.receiverId,
    before?.authorId,
    before?.fromUserId,
    before?.toUserId,
    argsData?.senderId,
    argsData?.receiverId,
    argsData?.authorId,
    argsData?.fromUserId,
    argsData?.toUserId,
    argsWhere?.id,
    argsWhere?.userId,
  ];

  for (const value of candidateValues) {
    if (typeof value === 'string' && value.trim()) {
      userIds.add(value.trim());
    }
  }

  return userIds;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const model = searchParams.get('model') ?? undefined;
  const action = searchParams.get('action') ?? undefined;

  const where = {
    ...(model ? { model } : {}),
    ...(action ? { action } : {}),
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
  for (const log of logs) {
    for (const userId of collectUserIdsFromLog(log)) {
      userIds.add(userId);
    }
  }

  const users = userIds.size
    ? await prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, name: true, lastName: true, email: true },
      })
    : [];

  const usersById = users.reduce<Record<string, string>>((acc, user) => {
    const fullName = [user.name, user.lastName].filter(Boolean).join(' ').trim();
    acc[user.id] = fullName || user.email;
    return acc;
  }, {});

  return NextResponse.json({
    logs,
    total,
    page,
    pageSize: PAGE_SIZE,
    usersById,
  });
}
