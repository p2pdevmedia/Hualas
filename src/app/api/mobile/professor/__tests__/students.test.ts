/**
 * @jest-environment node
 */

jest.mock('@/lib/mobile-auth', () => ({
  getMobileSessionFromRequest: jest.fn(),
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    activityParticipant: {
      findMany: jest.fn(),
    },
  },
}));

import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import { GET } from '../students/route';

const mockPrisma = prisma as unknown as {
  activityParticipant: {
    findMany: jest.Mock;
  };
};

describe('GET /api/mobile/professor/students', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps professor assignment scoped when filtering by groupId', async () => {
    (getMobileSessionFromRequest as jest.Mock).mockResolvedValueOnce({
      userId: 'professor-1',
      appRole: 'PROFESSOR',
    });
    mockPrisma.activityParticipant.findMany.mockResolvedValueOnce([]);

    await GET(
      new Request(
        'http://localhost/api/mobile/professor/students?groupId=group-2'
      )
    );

    expect(mockPrisma.activityParticipant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
          AND: expect.arrayContaining([
            expect.objectContaining({
              groupMembership: {
                activityGroupId: 'group-2',
                activityGroup: {
                  professors: { some: { userId: 'professor-1' } },
                },
              },
            }),
          ]),
        }),
      })
    );
  });

  it('keeps ungrouped activity fallback for professor-assigned activities', async () => {
    (getMobileSessionFromRequest as jest.Mock).mockResolvedValueOnce({
      userId: 'professor-1',
      appRole: 'PROFESSOR',
    });
    mockPrisma.activityParticipant.findMany.mockResolvedValueOnce([]);

    await GET(new Request('http://localhost/api/mobile/professor/students'));

    expect(mockPrisma.activityParticipant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                expect.objectContaining({
                  groupMembership: { is: null },
                  activity: {
                    professors: { some: { userId: 'professor-1' } },
                  },
                }),
              ]),
            }),
          ]),
        }),
      })
    );
  });
});
