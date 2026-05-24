/**
 * @jest-environment node
 */

jest.mock('next-auth');
jest.mock('@/lib/auth');
jest.mock('@/lib/notifications/notification-service', () => ({
  notifyChatMessage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    activityParticipant: {
      findFirst: jest.fn(),
    },
    conversation: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    message: {
      create: jest.fn(),
    },
  },
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { POST } from '../[userId]/route';

describe('POST /api/messages/[userId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows accounting users to message any existing user by capability', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: {
        id: 'counter1',
        role: 'MEMBER',
        activeRole: 'MEMBER',
        roles: ['MEMBER', 'COUNTER'],
      },
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'member1',
      role: 'MEMBER',
    });
    (prisma.conversation.findFirst as jest.Mock).mockResolvedValueOnce(null);
    (prisma.conversation.create as jest.Mock).mockResolvedValueOnce({
      id: 'conversation1',
    });
    (prisma.message.create as jest.Mock).mockResolvedValueOnce({
      id: 'message1',
      conversationId: 'conversation1',
      senderId: 'counter1',
      body: 'Hola Tania',
      createdAt: new Date('2026-05-24T12:00:00.000Z'),
    });

    const req = new Request('http://localhost/api/messages/member1', {
      method: 'POST',
      body: JSON.stringify({ content: 'Hola Tania' }),
    });

    const res = await POST(req as any, { params: { userId: 'member1' } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      from: 'counter1',
      content: 'Hola Tania',
      createdAt: '2026-05-24T12:00:00.000Z',
    });
    expect(prisma.activityParticipant.findFirst).not.toHaveBeenCalled();
    expect(prisma.conversation.create).toHaveBeenCalledWith({
      data: {
        participants: {
          create: [{ userId: 'counter1' }, { userId: 'member1' }],
        },
      },
    });
  });

  it('keeps regular members from messaging arbitrary non-admin users', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: {
        id: 'member1',
        role: 'MEMBER',
        activeRole: 'MEMBER',
        roles: ['MEMBER'],
      },
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'member2',
      role: 'MEMBER',
    });

    const req = new Request('http://localhost/api/messages/member2', {
      method: 'POST',
      body: JSON.stringify({ content: 'Hola' }),
    });

    const res = await POST(req as any, { params: { userId: 'member2' } });

    expect(res.status).toBe(403);
    expect(prisma.conversation.create).not.toHaveBeenCalled();
    expect(prisma.message.create).not.toHaveBeenCalled();
  });
});
