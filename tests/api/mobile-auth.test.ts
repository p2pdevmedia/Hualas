/**
 * @jest-environment node
 */

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

const mockMobileSessionCreate = jest.fn().mockResolvedValue({
  id: 'mobile_session_1',
  userId: 'user_1',
  appRole: 'MEMBER',
  expiresAt: new Date('2026-06-01T00:00:00.000Z'),
  createdAt: new Date('2026-05-07T00:00:00.000Z'),
  lastUsedAt: new Date('2026-05-07T00:00:00.000Z'),
});

const mockUserUpdate = jest.fn().mockResolvedValue({});
const mockAuditCreate = jest.fn().mockResolvedValue({});
const mockUserFindUnique = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    mobileSession: {
      create: (...args: unknown[]) => mockMobileSessionCreate(...args),
    },
    dbAuditLog: {
      create: (...args: unknown[]) => mockAuditCreate(...args),
    },
  },
}));

import { compare } from 'bcrypt';
import { POST as loginPOST } from '@/app/api/mobile/auth/login/route';

const mockedCompare = compare as unknown as jest.Mock;

describe('mobile auth login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCompare.mockResolvedValue(true);
  });

  it('allows MEMBER login and returns a bearer token', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'user_1',
      email: 'member@hualas.com',
      password: 'hashed-password',
      isActive: true,
      role: 'MEMBER',
      activeRole: 'MEMBER',
      name: 'Marta',
      lastName: 'Paz',
      roleAssignments: [],
    });

    const response = await loginPOST(
      new Request('http://localhost/api/mobile/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'member@hualas.com',
          password: 'secret',
          role: 'MEMBER',
          platform: 'iOS',
          deviceName: 'iPhone 15',
        }),
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.token).toEqual(expect.any(String));
    expect(payload.session.appRole).toBe('MEMBER');
    expect(payload.user.allowedRoles).toContain('MEMBER');
    expect(mockMobileSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user_1',
          appRole: 'MEMBER',
          platform: 'iOS',
          deviceName: 'iPhone 15',
        }),
      })
    );
    expect(mockAuditCreate).toHaveBeenCalled();
  });

  it('rejects PROFESSOR login when the account is not enabled for it', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'user_1',
      email: 'member@hualas.com',
      password: 'hashed-password',
      isActive: true,
      role: 'MEMBER',
      activeRole: 'MEMBER',
      name: 'Marta',
      lastName: 'Paz',
      roleAssignments: [],
    });

    const response = await loginPOST(
      new Request('http://localhost/api/mobile/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'member@hualas.com',
          password: 'secret',
          role: 'PROFESSOR',
        }),
      })
    );

    expect(response.status).toBe(403);
    expect(mockMobileSessionCreate).not.toHaveBeenCalled();
  });
});
