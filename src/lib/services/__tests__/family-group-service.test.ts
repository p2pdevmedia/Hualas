/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    familyGroupMember: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { familyGroupService } from '@/lib/services/family-group-service';

const mockPrisma = prisma as unknown as {
  familyGroupMember: {
    findMany: jest.Mock;
  };
};

describe('familyGroupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('selects only safe member fields when listing family group members', async () => {
    mockPrisma.familyGroupMember.findMany.mockResolvedValueOnce([]);

    await familyGroupService.getMembersForFamilyGroup('family-1');

    expect(mockPrisma.familyGroupMember.findMany).toHaveBeenCalledWith({
      where: { familyGroupId: 'family-1' },
      select: {
        id: true,
        familyGroupId: true,
        memberId: true,
        relationship: true,
        isPaymentResponsible: true,
        createdAt: true,
        member: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  });
});
