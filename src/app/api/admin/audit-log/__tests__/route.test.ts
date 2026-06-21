/**
 * @jest-environment node
 */

jest.mock('next-auth');
jest.mock('@/lib/auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
    },
    activity: {
      findMany: jest.fn(),
    },
    conversation: {
      findMany: jest.fn(),
    },
    dbAuditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GET } from '../route';

const mockPrisma = prisma as unknown as {
  user: {
    findMany: jest.Mock;
  };
  activity: {
    findMany: jest.Mock;
  };
  conversation: {
    findMany: jest.Mock;
  };
  dbAuditLog: {
    findMany: jest.Mock;
    count: jest.Mock;
  };
};

describe('GET /api/admin/audit-log', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: 'super-admin-1',
        role: 'ADMIN',
        activeRole: 'ADMIN',
        roles: ['ADMIN', 'SUPER_ADMIN'],
      },
    });
    mockPrisma.dbAuditLog.findMany.mockResolvedValue([]);
    mockPrisma.dbAuditLog.count.mockResolvedValue(0);
  });

  it('filters audit logs by exact user id when userId is provided', async () => {
    const res = await GET(
      new NextRequest(
        'http://localhost/api/admin/audit-log?page=1&userId=user-1'
      )
    );

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      logs: [],
      total: 0,
      page: 1,
      pageSize: 25,
    });
    expect(mockPrisma.dbAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [{ userId: 'user-1' }, { model: 'User', recordId: 'user-1' }],
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 25,
      })
    );
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
  });
});
