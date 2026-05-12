/**
 * @jest-environment node
 */

jest.mock('next-auth');
jest.mock('@/lib/auth');

jest.mock('@/lib/prisma', () => ({
  prisma: {
    activity: {
      count: jest.fn(),
    },
    news: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { PUT } from '../[id]/route';

describe('PUT /api/news/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 if not admin', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'MEMBER' },
    });

    const formData = new FormData();
    formData.set('title', 'Título actualizado');
    formData.set('body', 'Texto actualizado');
    formData.set('scope', 'CLUB');

    const req = new Request('http://localhost/api/news/news1', {
      method: 'PUT',
      body: formData,
    });

    const res = await PUT(req, { params: { id: 'news1' } });

    expect(res.status).toBe(401);
    expect(prisma.news.update).not.toHaveBeenCalled();
  });

  it('updates a news item when the user is admin', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'ADMIN' },
    });
    (prisma.news.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'news1',
    });
    (prisma.news.update as jest.Mock).mockResolvedValueOnce({
      id: 'news1',
      title: 'Título actualizado',
    });

    const formData = new FormData();
    formData.set('title', 'Título actualizado');
    formData.set('body', 'Texto actualizado');
    formData.set('scope', 'CLUB');

    const req = new Request('http://localhost/api/news/news1', {
      method: 'PUT',
      body: formData,
    });

    const res = await PUT(req, { params: { id: 'news1' } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, id: 'news1' });
    expect(prisma.news.update).toHaveBeenCalledWith({
      where: { id: 'news1' },
      data: {
        title: 'Título actualizado',
        body: 'Texto actualizado',
        scope: 'CLUB',
        activityId: null,
      },
      select: { id: true },
    });
  });

  it('requires an existing activity for activity-scoped news', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'admin1', role: 'SUPER_ADMIN' },
    });
    (prisma.news.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'news1',
    });
    (prisma.activity.count as jest.Mock).mockResolvedValueOnce(0);

    const formData = new FormData();
    formData.set('title', 'Título actualizado');
    formData.set('body', 'Texto actualizado');
    formData.set('scope', 'ACTIVITY');
    formData.set('activityId', 'missing-activity');

    const req = new Request('http://localhost/api/news/news1', {
      method: 'PUT',
      body: formData,
    });

    const res = await PUT(req, { params: { id: 'news1' } });

    expect(res.status).toBe(404);
    expect(prisma.news.update).not.toHaveBeenCalled();
  });
});
