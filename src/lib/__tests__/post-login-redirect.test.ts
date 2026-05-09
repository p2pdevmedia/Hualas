/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    activityParticipant: {
      count: jest.fn(),
    },
    activityProfessor: {
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/family-access', () => ({
  getAccessibleChildOwnerIds: jest.fn(),
}));

import type { Session } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import {
  getPostLoginRedirectUrl,
  shouldUseMyActivitiesAsHome,
} from '../post-login-redirect';

const mockPrisma = prisma as unknown as {
  activityParticipant: { count: jest.Mock };
  activityProfessor: { count: jest.Mock };
  user: { findUnique: jest.Mock };
};

const mockGetAccessibleChildOwnerIds = getAccessibleChildOwnerIds as jest.Mock;

function buildSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    expires: '2026-12-31T00:00:00.000Z',
    user: {
      id: 'user_1',
      role: 'MEMBER',
      activeRole: 'MEMBER',
      roles: ['MEMBER'],
      email: 'socio@hualas.test',
      ...overrides,
    },
  };
}

describe('getPostLoginRedirectUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAccessibleChildOwnerIds.mockResolvedValue(['user_1']);
    mockPrisma.activityParticipant.count.mockResolvedValue(0);
    mockPrisma.activityProfessor.count.mockResolvedValue(0);
    mockPrisma.user.findUnique.mockResolvedValue({
      name: 'Ana',
      lastName: 'López',
      dni: '12345678',
      birthDate: new Date('1990-01-01T00:00:00.000Z'),
      address: 'San Martín 123',
      phone: '2944000000',
    });
  });

  it('envía a Mis actividades cuando el usuario ya tiene inscripciones', async () => {
    mockPrisma.activityParticipant.count.mockResolvedValue(1);

    await expect(getPostLoginRedirectUrl(buildSession())).resolves.toBe(
      '/my-activities'
    );
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('incluye inscripciones de menores accesibles al decidir la pantalla inicial', async () => {
    mockGetAccessibleChildOwnerIds.mockResolvedValue(['user_1', 'parent_2']);
    mockPrisma.activityParticipant.count.mockResolvedValue(1);

    await getPostLoginRedirectUrl(buildSession());

    expect(mockPrisma.activityParticipant.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { userId: 'user_1' },
          { child: { userId: { in: ['user_1', 'parent_2'] } } },
        ],
      },
    });
  });

  it('envía siempre al profesor a Mis actividades aunque no tenga actividades asignadas', async () => {
    await expect(
      getPostLoginRedirectUrl(
        buildSession({
          role: 'PROFESSOR',
          activeRole: 'PROFESSOR',
          roles: ['MEMBER', 'PROFESSOR'],
        })
      )
    ).resolves.toBe('/my-activities');

    expect(mockGetAccessibleChildOwnerIds).not.toHaveBeenCalled();
    expect(mockPrisma.activityParticipant.count).not.toHaveBeenCalled();
    expect(mockPrisma.activityProfessor.count).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('detecta Mis actividades como home principal cuando un hijo accesible tiene inscripciones', async () => {
    mockGetAccessibleChildOwnerIds.mockResolvedValue(['user_1', 'parent_2']);
    mockPrisma.activityParticipant.count.mockResolvedValue(1);

    await expect(shouldUseMyActivitiesAsHome(buildSession())).resolves.toBe(
      true
    );
  });

  it('mantiene el onboarding actual si no tiene actividades y el perfil está incompleto', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      name: 'Ana',
      lastName: null,
      dni: null,
      birthDate: null,
      address: null,
      phone: null,
    });

    await expect(getPostLoginRedirectUrl(buildSession())).resolves.toBe(
      '/profile?onboarding=1'
    );
  });

  it('mantiene el inicio actual si no tiene actividades y el perfil está completo', async () => {
    await expect(getPostLoginRedirectUrl(buildSession())).resolves.toBe('/');
  });

  it('mantiene la ruta contable para usuarios de mostrador', async () => {
    await expect(
      getPostLoginRedirectUrl(buildSession({ role: 'COUNTER' }))
    ).resolves.toBe('/accounting');
    expect(mockPrisma.activityParticipant.count).not.toHaveBeenCalled();
  });
});
