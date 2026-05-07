/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    payment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    child: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { listManualPayments } from '@/lib/services/manual-payment-service';

const mockPrisma = prisma as unknown as {
  $queryRaw: jest.Mock;
  payment: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
  };
  child: {
    findMany: jest.Mock;
  };
};

describe('manual payment service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves the child name for activity payments in the summary', async () => {
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ id: 'payment_1' }]);

    mockPrisma.payment.findMany.mockResolvedValueOnce([
      {
        id: 'payment_1',
        orderId: 'order_1',
        status: 'PENDING',
        amount: 6500,
        currency: 'ARS',
        paidAt: null,
        createdAt: new Date('2026-05-06T10:00:00Z'),
        updatedAt: new Date('2026-05-06T10:00:00Z'),
        payerName: 'Ivan Muller',
        payerEmail: 'mullerivan@gmail.com',
        receiptUrl: 'https://blob.example.com/proof.pdf',
        rawData: {
          validatedItems: [
            { activityId: 'act_1', target: 'child_1', targetLabel: 'Hijo' },
          ],
        },
        order: {
          responsibleUserId: 'user_1',
          responsibleName: 'Ivan Muller',
          responsibleEmail: 'mullerivan@gmail.com',
          items: [
            {
              description: 'Kayak',
              billableConcept: { code: 'ACTIVITY_FEE' },
              activity: {
                id: 'act_1',
                name: 'Kayak',
                description: 'Salida en kayak',
              },
            },
          ],
        },
      },
    ]);

    mockPrisma.child.findMany.mockResolvedValueOnce([
      { id: 'child_1', name: 'Francine', lastName: 'Lopez Osornio' },
    ]);

    const result = await listManualPayments({
      limit: 20,
      offset: 0,
      q: '',
      status: null,
    });

    expect(result.total).toBe(1);
    expect(result.items[0].activities[0]).toMatchObject({
      id: 'act_1',
      name: 'Kayak',
      participantName: 'Francine Lopez Osornio',
      targetId: 'child_1',
      targetLabel: 'Hijo',
    });
  });
});
