/**
 * @jest-environment node
 */

jest.mock('next-auth');
jest.mock('@/lib/auth');
jest.mock('@vercel/blob', () => ({
  get: jest.fn(),
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    familyGroup: {
      findFirst: jest.fn(),
    },
    activityParticipant: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

import { getServerSession } from 'next-auth';
import { get } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
import { GET } from '../photo/route';

const mockPrisma = prisma as unknown as {
  familyGroup: {
    findFirst: jest.Mock;
  };
  activityParticipant: {
    findFirst: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
  };
};

describe('GET /api/users/[id]/photo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not proxy an unrelated user profile photo', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'viewer-1', role: 'MEMBER', roles: ['MEMBER'] },
    });
    mockPrisma.familyGroup.findFirst.mockResolvedValueOnce(null);
    mockPrisma.activityParticipant.findFirst.mockResolvedValueOnce(null);
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      profilePhoto: 'https://blob.example/private-photo.jpg',
    });
    (get as jest.Mock).mockResolvedValueOnce({
      statusCode: 200,
      headers: new Headers({ 'Content-Type': 'image/jpeg' }),
      stream: new ReadableStream(),
    });

    const res = await GET(
      new Request('http://localhost/api/users/target-1/photo'),
      { params: { id: 'target-1' } }
    );

    expect(res.status).toBe(403);
    expect(get).not.toHaveBeenCalled();
  });
});
