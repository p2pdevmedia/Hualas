/**
 * @jest-environment node
 */

jest.mock('next-auth');
jest.mock('@/lib/auth');

jest.mock('@/lib/prisma', () => ({
  prisma: {
    activity: {
      findUnique: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    activityGroup: {
      create: jest.fn(),
    },
    activityGroupProfessor: {
      createMany: jest.fn(),
    },
  },
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { POST } from '../route';

describe('POST /api/activities/[id]/groups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not default group professors to the activity professors', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'admin-1', role: 'ADMIN' },
    });
    (prisma.activity.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'activity-1',
      professors: [{ userId: 'professor-1' }, { userId: 'professor-2' }],
    });

    const req = new Request(
      'http://localhost/api/activities/activity-1/groups',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Grupo A',
          capacity: 12,
          minAge: 8,
          maxAge: 12,
          professorIds: [],
        }),
      }
    );

    const res = await POST(req, { params: { id: 'activity-1' } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({
      error: 'Selecciona al menos un profesor para el grupo',
    });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(prisma.activityGroup.create).not.toHaveBeenCalled();
    expect(prisma.activityGroupProfessor.createMany).not.toHaveBeenCalled();
  });
});
