/**
 * @jest-environment node
 */

const mockGetServerSession = jest.fn();
const mockBlobPut = jest.fn();
const mockBlobDel = jest.fn();
const mockUserFindFirst = jest.fn();
const mockProfessorInvoiceCreate = jest.fn();
const mockNotifyProfessorInvoiceCreated = jest.fn();

jest.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock('@vercel/blob', () => ({
  put: (...args: unknown[]) => mockBlobPut(...args),
  del: (...args: unknown[]) => mockBlobDel(...args),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: mockUserFindFirst,
    },
    professorInvoice: {
      create: mockProfessorInvoiceCreate,
    },
  },
}));

jest.mock('@/lib/notifications/notification-service', () => ({
  notifyProfessorInvoiceCreated: (...args: unknown[]) =>
    mockNotifyProfessorInvoiceCreated(...args),
}));

function invoiceRequest(
  file = new File(['pdf'], 'factura.pdf', {
    type: 'application/pdf',
  })
) {
  const formData = new FormData();
  formData.append('file', file);
  return new Request('http://test.local/api/professors/professor_1/invoices', {
    method: 'POST',
    body: formData,
  });
}

describe('professor invoice uploads', () => {
  const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BLOB_READ_WRITE_TOKEN = 'test-blob-token';
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'professor_1',
        role: 'SUPER_ADMIN',
        activeRole: 'PROFESSOR',
      },
    });
    mockUserFindFirst.mockResolvedValue({ id: 'professor_1' });
    mockBlobPut.mockResolvedValue({ url: 'https://blob.example/factura.pdf' });
    mockBlobDel.mockResolvedValue(undefined);
    mockProfessorInvoiceCreate.mockResolvedValue({
      id: 'invoice_1',
      originalName: 'factura.pdf',
      contentType: 'application/pdf',
      size: 3,
      status: 'PENDING',
      approvedAt: null,
      transferredAt: null,
      createdAt: new Date('2026-06-01T12:00:00.000Z'),
    });
    mockNotifyProfessorInvoiceCreated.mockResolvedValue(undefined);
  });

  afterAll(() => {
    if (originalBlobToken === undefined) {
      delete process.env.BLOB_READ_WRITE_TOKEN;
    } else {
      process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
    }
  });

  it('lets the professor upload when PROFESSOR is the active role', async () => {
    const { POST } = await import('@/app/api/professors/[id]/invoices/route');

    const response = await POST(invoiceRequest(), {
      params: { id: 'professor_1' },
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mockBlobPut).toHaveBeenCalledWith(
      expect.stringMatching(/^professor-invoices\/professor_1\/.+\.pdf$/),
      expect.any(File),
      expect.objectContaining({
        access: 'private',
        contentType: 'application/pdf',
      })
    );
    expect(mockProfessorInvoiceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          professorId: 'professor_1',
          blobUrl: 'https://blob.example/factura.pdf',
        }),
      })
    );
    expect(body.invoice.status).toBe('PENDING');
  });

  it('returns a clear configuration error when Vercel Blob token is missing', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const { POST } = await import('@/app/api/professors/[id]/invoices/route');

    const response = await POST(invoiceRequest(), {
      params: { id: 'professor_1' },
    });
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain('BLOB_READ_WRITE_TOKEN');
    expect(mockBlobPut).not.toHaveBeenCalled();
    expect(mockProfessorInvoiceCreate).not.toHaveBeenCalled();
  });

  it('returns a clear storage error when Blob upload fails', async () => {
    mockBlobPut.mockRejectedValueOnce(new Error('Blob store rejected upload'));
    const { POST } = await import('@/app/api/professors/[id]/invoices/route');

    const response = await POST(invoiceRequest(), {
      params: { id: 'professor_1' },
    });
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toContain('Vercel Blob');
    expect(mockProfessorInvoiceCreate).not.toHaveBeenCalled();
  });
});
