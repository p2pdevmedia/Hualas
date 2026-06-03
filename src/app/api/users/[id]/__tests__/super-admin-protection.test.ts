/**
 * @jest-environment node
 */

jest.mock('next-auth');
jest.mock('@/lib/auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { DELETE } from '../route';
import { POST as RESET_PASSWORD } from '../reset-password/route';

const mockPrisma = prisma as unknown as {
  user: {
    findUnique: jest.Mock;
    delete: jest.Mock;
    update: jest.Mock;
  };
};

describe('super admin account protections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: 'admin-1',
        role: 'ADMIN',
        activeRole: 'ADMIN',
        roles: ['MEMBER', 'ADMIN'],
      },
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'super-1',
      roleAssignments: [{ role: 'SUPER_ADMIN' }],
    });
  });

  it('blocks a regular admin from deleting a super admin account', async () => {
    const res = await DELETE(
      new Request('http://localhost/api/users/super-1', { method: 'DELETE' }),
      { params: { id: 'super-1' } }
    );

    expect(res.status).toBe(403);
    expect(mockPrisma.user.delete).not.toHaveBeenCalled();
  });

  it('blocks a regular admin from resetting a super admin password', async () => {
    const res = await RESET_PASSWORD(
      new Request('http://localhost/api/users/super-1/reset-password', {
        method: 'POST',
      }),
      { params: { id: 'super-1' } }
    );

    expect(res.status).toBe(403);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});
