/**
 * @jest-environment node
 */

jest.mock('next-auth');
jest.mock('@/lib/auth');
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    form: {
      delete: jest.fn(),
      update: jest.fn(),
    },
    formField: {
      deleteMany: jest.fn(),
    },
    formResponse: {
      deleteMany: jest.fn(),
    },
  },
}));

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { DELETE, PUT } from '../route';

const mockPrisma = prisma as unknown as {
  $transaction: jest.Mock;
  form: {
    delete: jest.Mock;
    update: jest.Mock;
  };
  formField: {
    deleteMany: jest.Mock;
  };
  formResponse: {
    deleteMany: jest.Mock;
  };
};

const mockTx = {
  form: {
    delete: jest.fn(),
  },
  formField: {
    deleteMany: jest.fn(),
  },
  formResponse: {
    deleteMany: jest.fn(),
  },
};

describe('PUT /api/forms/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    });
    mockPrisma.formField.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.form.update.mockResolvedValue({
      id: 'form-1',
      title: 'Formulario actualizado',
    });
  });

  it('updates the form and revalidates the forms listing', async () => {
    const req = new Request('http://localhost/api/forms/form-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Formulario actualizado',
        fields: [
          {
            label: 'Nombre',
            type: 'text',
            options: [],
            required: true,
          },
        ],
      }),
    });

    const res = await PUT(req, { params: { id: 'form-1' } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      id: 'form-1',
      title: 'Formulario actualizado',
    });
    expect(mockPrisma.formField.deleteMany).toHaveBeenCalledWith({
      where: { formId: 'form-1' },
    });
    expect(mockPrisma.form.update).toHaveBeenCalledWith({
      where: { id: 'form-1' },
      data: {
        title: 'Formulario actualizado',
        fields: {
          create: [
            {
              label: 'Nombre',
              type: 'text',
              options: [],
              required: true,
              order: 0,
            },
          ],
        },
      },
      include: { fields: true },
    });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/forms');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/forms/form-1');
  });
});

describe('DELETE /api/forms/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    });
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));
    mockTx.form.delete.mockResolvedValue({ id: 'form-1' });
    mockTx.formField.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.formResponse.deleteMany.mockResolvedValue({ count: 0 });
  });

  it('removes responses, fields, and the form itself', async () => {
    const res = await DELETE(
      new Request('http://localhost/api/forms/form-1', { method: 'DELETE' }),
      { params: { id: 'form-1' } }
    );

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true });
    expect(mockTx.formResponse.deleteMany).toHaveBeenCalledWith({
      where: { formId: 'form-1' },
    });
    expect(mockTx.formField.deleteMany).toHaveBeenCalledWith({
      where: { formId: 'form-1' },
    });
    expect(mockTx.form.delete).toHaveBeenCalledWith({
      where: { id: 'form-1' },
    });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/forms');
  });

  it('returns 404 when the form does not exist', async () => {
    const notFoundError = Object.assign(new Error('Missing'), {
      code: 'P2025',
    });
    mockTx.form.delete.mockRejectedValueOnce(notFoundError);

    const res = await DELETE(
      new Request('http://localhost/api/forms/missing', { method: 'DELETE' }),
      { params: { id: 'missing' } }
    );

    expect(res.status).toBe(404);
  });
});
