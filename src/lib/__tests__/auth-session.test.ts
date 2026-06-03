/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import { compare } from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { resetRateLimitStore } from '@/lib/security/rate-limit';

const mockPrisma = prisma as unknown as {
  user: {
    findUnique: jest.Mock;
  };
};

describe('auth session freshness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimitStore();
  });

  it('refreshes JWT roles from the database on session access', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      isActive: true,
      activeRole: 'ADMIN',
      roleAssignments: [],
    });

    const token = await authOptions.callbacks!.jwt!({
      token: {
        sub: 'user-1',
        role: 'ADMIN',
        activeRole: 'ADMIN',
        roles: ['MEMBER', 'ADMIN'],
      },
    } as any);

    expect(token.roles).toEqual(['MEMBER']);
    expect(token.activeRole).toBe('MEMBER');
    expect(token.role).toBe('MEMBER');
    expect(token.isActive).toBe(true);
  });

  it('returns no session when the account is inactive', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      isActive: false,
      activeRole: 'ADMIN',
      roleAssignments: [{ role: 'ADMIN' }],
    });

    const token = await authOptions.callbacks!.jwt!({
      token: {
        sub: 'user-1',
        role: 'ADMIN',
        activeRole: 'ADMIN',
        roles: ['MEMBER', 'ADMIN'],
      },
    } as any);

    const session = await authOptions.callbacks!.session!({
      session: {
        expires: '2026-12-31T00:00:00.000Z',
        user: { id: 'user-1', email: 'user@example.com' },
      },
      token,
    } as any);

    expect(token.isActive).toBe(false);
    expect(session).toBeNull();
  });

  it('rate-limits repeated credential login attempts by email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Ada',
      password: 'hashed',
      isActive: true,
      role: 'MEMBER',
      activeRole: 'MEMBER',
    });
    (compare as jest.Mock).mockResolvedValue(true);

    const provider = authOptions.providers.find(
      (entry) => entry.id === 'credentials'
    ) as any;
    const authorize = provider.options.authorize;

    for (let index = 0; index < 10; index += 1) {
      await expect(
        authorize({
          email: 'user@example.com',
          password: 'secret',
        })
      ).resolves.toEqual(expect.objectContaining({ id: 'user-1' }));
    }

    await expect(
      authorize({
        email: 'user@example.com',
        password: 'secret',
      })
    ).resolves.toBeNull();
  });
});
