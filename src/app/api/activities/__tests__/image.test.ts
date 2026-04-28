/**
 * @jest-environment node
 */

jest.mock('next-auth');
jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  del: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/auth');

jest.mock('@/lib/prisma', () => ({
  prisma: {
    activity: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { POST, DELETE } from '../[id]/image/route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import * as blob from '@vercel/blob';

describe('POST /api/activities/[id]/image', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 if not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'POST',
    });

    const res = await POST(req, { params: { id: '123' } });
    expect(res.status).toBe(401);
  });

  it('returns 401 if not admin', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'MEMBER' },
    });

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'POST',
    });

    const res = await POST(req, { params: { id: '123' } });
    expect(res.status).toBe(401);
  });

  it('returns 400 if no file provided', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' },
    });

    const formData = new FormData();
    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req, { params: { id: '123' } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('No se recibió');
  });

  it('returns 400 if file is not an image', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' },
    });

    const formData = new FormData();
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    formData.append('image', file);

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req, { params: { id: '123' } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('debe ser una imagen');
  });

  it('returns 400 if file is larger than 5MB', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' },
    });

    const formData = new FormData();
    const largeBuffer = new ArrayBuffer(6 * 1024 * 1024);
    const file = new File([largeBuffer], 'test.jpg', { type: 'image/jpeg' });
    formData.append('image', file);

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req, { params: { id: '123' } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('debe pesar menos');
  });

  it('returns 404 if activity not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' },
    });
    (prisma.activity.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const formData = new FormData();
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('image', file);

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req, { params: { id: '123' } });
    expect(res.status).toBe(404);
  });

  it('successfully uploads image to blob and updates activity', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' },
    });
    (prisma.activity.findUnique as jest.Mock).mockResolvedValueOnce({
      id: '123',
      image: null,
    });
    (blob.put as jest.Mock).mockResolvedValueOnce({
      url: 'https://blob.vercelusercontent.com/activity-images/123/uuid.jpg',
    });
    (prisma.activity.update as jest.Mock).mockResolvedValueOnce({
      id: '123',
      image: 'https://blob.vercelusercontent.com/activity-images/123/uuid.jpg',
    });

    const formData = new FormData();
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('image', file);

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req, { params: { id: '123' } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(blob.put).toHaveBeenCalled();
    expect(prisma.activity.update).toHaveBeenCalled();
  });

  it('deletes old image when replacing', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' },
    });
    (prisma.activity.findUnique as jest.Mock).mockResolvedValueOnce({
      id: '123',
      image: 'https://blob.vercelusercontent.com/old/image.jpg',
    });
    (blob.put as jest.Mock).mockResolvedValueOnce({
      url: 'https://blob.vercelusercontent.com/activity-images/123/new.jpg',
    });
    (prisma.activity.update as jest.Mock).mockResolvedValueOnce({
      id: '123',
      image: 'https://blob.vercelusercontent.com/activity-images/123/new.jpg',
    });

    const formData = new FormData();
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('image', file);

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req, { params: { id: '123' } });
    expect(res.status).toBe(200);
    expect(blob.del).toHaveBeenCalledWith(
      'https://blob.vercelusercontent.com/old/image.jpg'
    );
  });
});

describe('DELETE /api/activities/[id]/image', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 if not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'DELETE',
    });

    const res = await DELETE(req, { params: { id: '123' } });
    expect(res.status).toBe(401);
  });

  it('returns 401 if not admin', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'MEMBER' },
    });

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'DELETE',
    });

    const res = await DELETE(req, { params: { id: '123' } });
    expect(res.status).toBe(401);
  });

  it('returns 404 if activity not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' },
    });
    (prisma.activity.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'DELETE',
    });

    const res = await DELETE(req, { params: { id: '123' } });
    expect(res.status).toBe(404);
  });

  it('returns 404 if activity has no image', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' },
    });
    (prisma.activity.findUnique as jest.Mock).mockResolvedValueOnce({
      id: '123',
      image: null,
    });

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'DELETE',
    });

    const res = await DELETE(req, { params: { id: '123' } });
    expect(res.status).toBe(404);
  });

  it('successfully deletes image from blob and updates activity', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' },
    });
    (prisma.activity.findUnique as jest.Mock).mockResolvedValueOnce({
      id: '123',
      image: 'https://blob.vercelusercontent.com/activity-images/123/uuid.jpg',
    });
    (blob.del as jest.Mock).mockResolvedValueOnce(undefined);
    (prisma.activity.update as jest.Mock).mockResolvedValueOnce({
      id: '123',
      image: null,
    });

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'DELETE',
    });

    const res = await DELETE(req, { params: { id: '123' } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(blob.del).toHaveBeenCalledWith(
      'https://blob.vercelusercontent.com/activity-images/123/uuid.jpg'
    );
    expect(prisma.activity.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: { image: null },
    });
  });
});
