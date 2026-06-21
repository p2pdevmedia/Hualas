/**
 * @jest-environment node
 */

jest.mock('next-auth');
jest.mock('@/lib/auth');

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    form: {
      delete: jest.fn(),
    },
    formField: {
      deleteMany: jest.fn(),
    },
    formResponse: {
      deleteMany: jest.fn(),
    },
  },
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { DELETE } from '../route';

const mockPrisma = prisma as unknown as {
  $transaction: jest.Mock;
  form: {
    delete: jest.Mock;
  };
  formField: {
    deleteMany: jest.Mock;
  };
  formResponse: {
    deleteMany: jest.Mock;
  };
};

describe('DELETE /api/forms/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    });
    mockPrisma.$transaction.mockResolvedValue(undefined);
    mockPrisma.form.delete.mockResolvedValue({ id: 'form-1' });
    mockPrisma.formField.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.formResponse.deleteMany.mockResolvedValue({ count: 0 });
  });

  it('removes responses, fields, and the form itself', async () => {
    const res = await DELETE(
      new Request('http://localhost/api/forms/form-1', { method: 'DELETE' }),
      { params: { id: 'form-1' } }
    );

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true });
    expect(mockPrisma.formResponse.deleteMany).toHaveBeenCalledWith({
      where: { formId: 'form-1' },
    });
    expect(mockPrisma.formField.deleteMany).toHaveBeenCalledWith({
      where: { formId: 'form-1' },
    });
    expect(mockPrisma.form.delete).toHaveBeenCalledWith({
      where: { id: 'form-1' },
    });
  });

  it('returns 404 when the form does not exist', async () => {
    const notFoundError = Object.assign(new Error('Missing'), {
      code: 'P2025',
    });
    mockPrisma.form.delete.mockRejectedValueOnce(notFoundError);

    const res = await DELETE(
      new Request('http://localhost/api/forms/missing', { method: 'DELETE' }),
      { params: { id: 'missing' } }
    );

    expect(res.status).toBe(404);
  });
});
