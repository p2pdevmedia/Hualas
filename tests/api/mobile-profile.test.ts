/**
 * @jest-environment node
 */

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

jest.mock('@/lib/mobile-auth', () => ({
  getMobileSessionFromRequest: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import { GET, PATCH } from '@/app/api/mobile/profile/route';

const mockGetMobileSessionFromRequest =
  getMobileSessionFromRequest as unknown as jest.Mock;
const mockPrisma = prisma as unknown as {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMobileSessionFromRequest.mockResolvedValue({
    userId: 'user_1',
    appRole: 'MEMBER',
    user: {
      id: 'user_1',
      email: 'member@hualas.com',
      name: 'Marta',
      lastName: 'Paz',
      role: 'MEMBER',
      activeRole: 'MEMBER',
      isActive: true,
      roleAssignments: [],
    },
  });
});

describe('mobile profile route', () => {
  it('returns the editable profile fields', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'member@hualas.com',
      name: 'Marta',
      lastName: 'Paz',
      dni: '12345678',
      birthDate: new Date('2000-01-01T00:00:00.000Z'),
      gender: 'FEMALE',
      address: 'Calle 1',
      phone: '123456789',
      nationality: 'Argentina',
      maritalStatus: 'Soltera',
      allergies: 'Polen',
      regularMedication: 'Ninguna',
      relevantDiseases: 'Ninguna',
      previousInjuries: 'Esguince',
      physicalRestrictions: 'Ninguna',
      bloodGroup: 'O+',
      primaryDoctor: 'Dra. Gómez',
      doctorPhone: '4444-4444',
      doctorCertificate: 'data:image/jpeg;base64,abc',
      socialFeeActive: true,
    });

    const response = await GET(new Request('http://localhost/api/mobile/profile', {
      headers: { authorization: 'Bearer token' },
    }));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.user.allergies).toBe('Polen');
    expect(payload.user.doctorCertificate).toBe('data:image/jpeg;base64,abc');
    expect(payload.user.socialFeeActive).toBe(true);
  });

  it('updates the additional profile fields', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.update.mockResolvedValue({
      id: 'user_1',
      email: 'member@hualas.com',
      name: 'Marta',
      lastName: 'Paz',
      dni: '12345678',
      birthDate: new Date('2000-01-01T00:00:00.000Z'),
      gender: 'FEMALE',
      address: 'Calle 1',
      phone: '123456789',
      nationality: 'Argentina',
      maritalStatus: 'Soltera',
      allergies: 'Polen',
      regularMedication: 'Ninguna',
      relevantDiseases: 'Ninguna',
      previousInjuries: 'Esguince',
      physicalRestrictions: 'Ninguna',
      bloodGroup: 'O+',
      primaryDoctor: 'Dra. Gómez',
      doctorPhone: '4444-4444',
      doctorCertificate: 'data:image/jpeg;base64,abc',
      socialFeeActive: false,
    });

    const response = await PATCH(
      new Request('http://localhost/api/mobile/profile', {
        method: 'PATCH',
        headers: {
          authorization: 'Bearer token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Marta',
          lastName: 'Paz',
          dni: '12345678',
          allergies: 'Polen',
          socialFeeActive: false,
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          allergies: 'Polen',
          socialFeeActive: false,
        }),
      })
    );
  });
});
