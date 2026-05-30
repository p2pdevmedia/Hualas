/**
 * @jest-environment node
 */

const mockGetServerSession = jest.fn();
const mockTransaction = jest.fn();
const mockProfessorProfileFindUnique = jest.fn();
const mockProfessorInvoiceFindUnique = jest.fn();
const mockProfessorPaymentCreate = jest.fn();
const mockProfessorInvoiceUpdate = jest.fn();
const mockProfessorPaymentFindUnique = jest.fn();
const mockProfessorPaymentUpdate = jest.fn();

jest.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/notifications/notification-service', () => ({
  notifyProfessorPaymentCancelled: jest.fn(),
  notifyProfessorPaymentPaid: jest.fn(),
}));

const tx = {
  professorPayment: {
    create: mockProfessorPaymentCreate,
    update: mockProfessorPaymentUpdate,
  },
  professorInvoice: {
    update: mockProfessorInvoiceUpdate,
  },
};

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: (callback: (txArg: typeof tx) => Promise<unknown>) =>
      mockTransaction(callback),
    professorProfile: {
      findUnique: mockProfessorProfileFindUnique,
    },
    professorInvoice: {
      findUnique: mockProfessorInvoiceFindUnique,
    },
    professorPayment: {
      findUnique: mockProfessorPaymentFindUnique,
    },
  },
}));

describe('professor payment invoice flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { id: 'counter_1', role: 'COUNTER' },
    });
    mockTransaction.mockImplementation(
      (callback: (txArg: typeof tx) => Promise<unknown>) => callback(tx)
    );
  });

  it('approves an uploaded invoice when creating a professor payment', async () => {
    const { POST } = await import('@/app/api/professors/[id]/payments/route');
    mockProfessorProfileFindUnique.mockResolvedValue({ id: 'profile_1' });
    mockProfessorInvoiceFindUnique.mockResolvedValue({
      id: 'invoice_1',
      professorId: 'professor_1',
      status: 'PENDING',
    });
    mockProfessorPaymentCreate.mockResolvedValue({
      id: 'payment_1',
      invoice: {
        id: 'invoice_1',
        status: 'PENDING',
        approvedAt: null,
        transferredAt: null,
      },
    });

    const response = await POST(
      new Request('http://test.local', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: 'invoice_1',
          periodMonth: 5,
          periodYear: 2026,
          amount: 100000,
        }),
      }),
      { params: { id: 'professor_1' } }
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mockProfessorPaymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          invoiceId: 'invoice_1',
          status: 'PENDING',
          createdById: 'counter_1',
        }),
      })
    );
    expect(mockProfessorInvoiceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'invoice_1' },
        data: expect.objectContaining({ status: 'APPROVED' }),
      })
    );
    expect(body.payment.invoice.status).toBe('APPROVED');
  });

  it('marks the linked invoice as transferred when payment is paid', async () => {
    const { PATCH } =
      await import('@/app/api/professor-payments/[paymentId]/route');
    mockProfessorPaymentFindUnique.mockResolvedValue({
      id: 'payment_1',
      invoiceId: 'invoice_1',
      notes: null,
      status: 'PENDING',
    });
    mockProfessorPaymentUpdate.mockResolvedValue({
      id: 'payment_1',
      status: 'PAID',
      paidAt: new Date('2026-05-29T12:00:00.000Z'),
      invoice: {
        id: 'invoice_1',
        status: 'APPROVED',
        approvedAt: new Date('2026-05-29T11:00:00.000Z'),
        transferredAt: null,
      },
    });

    const response = await PATCH(
      new Request('http://test.local', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'PAID',
          paidAt: '2026-05-29T12:00:00.000Z',
        }),
      }),
      { params: { paymentId: 'payment_1' } }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockProfessorInvoiceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'invoice_1' },
        data: expect.objectContaining({ status: 'TRANSFERRED' }),
      })
    );
    expect(body.payment.invoice.status).toBe('TRANSFERRED');
  });
});
