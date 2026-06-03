/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    billableConcept: {
      upsert: jest.fn(),
    },
    order: {
      update: jest.fn(),
    },
    orderItem: {
      updateMany: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    child: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  del: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/services/family-group-service', () => ({
  familyGroupService: {
    getOrCreateFamilyGroupByResponsible: jest.fn(),
  },
}));

jest.mock('@/lib/activity-payments', () => ({
  registerActivityParticipantPayment: jest.fn(),
}));

jest.mock('@/lib/social-fee', () => ({
  registerSocialFeePayment: jest.fn(),
}));

jest.mock('@/lib/notifications/notification-service', () => ({
  notifyManualPaymentApproved: jest.fn(),
  notifyManualPaymentRejected: jest.fn(),
}));

import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import { familyGroupService } from '@/lib/services/family-group-service';
import {
  createManualPaymentCheckout,
  listManualPayments,
  rejectManualPayment,
} from '@/lib/services/manual-payment-service';

const mockPrisma = prisma as unknown as {
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
  billableConcept: {
    upsert: jest.Mock;
  };
  order: {
    update: jest.Mock;
  };
  orderItem: {
    updateMany: jest.Mock;
  };
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

  it('does not activate activity participants while a manual transfer is pending', async () => {
    (put as jest.Mock).mockResolvedValueOnce({
      url: 'https://blob.example/manual-proof.pdf',
    });
    (
      familyGroupService.getOrCreateFamilyGroupByResponsible as jest.Mock
    ).mockResolvedValueOnce({
      id: 'family-1',
    });

    mockPrisma.billableConcept.upsert
      .mockResolvedValueOnce({ id: 'activity-fee' })
      .mockResolvedValueOnce({ id: 'social-fee' })
      .mockResolvedValueOnce({ id: 'discount' });

    const tx = {
      order: {
        create: jest.fn().mockResolvedValue({ id: 'order-1' }),
      },
      orderItem: {
        create: jest.fn().mockResolvedValue({ id: 'item-1' }),
      },
      activityParticipant: {
        upsert: jest.fn(),
      },
      activityGroupMember: {
        upsert: jest.fn(),
      },
      payment: {
        create: jest.fn().mockResolvedValue({
          id: 'payment-1',
          status: 'PENDING',
        }),
      },
    };

    mockPrisma.$transaction.mockImplementation((arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === 'function') return arg(tx);
      return Promise.resolve(arg);
    });

    const result = await createManualPaymentCheckout({
      user: {
        id: 'user-1',
        email: 'member@example.com',
        name: 'Ada',
        lastName: 'Lovelace',
      },
      proofFile: new File(['%PDF-1.4'], 'proof.pdf', {
        type: 'application/pdf',
      }),
      quote: {
        activityLines: [
          {
            id: 'activity-1',
            name: 'Kayak',
            amount: 1000,
            targetLabel: 'Para mí',
          },
        ],
        activityMonthlyPaymentLines: [],
        discountLines: [],
        socialFeeLines: [],
        mercadoPagoFeeLines: [],
        totalActivityAmount: 1000,
        totalActivityMonthlyPaymentAmount: 0,
        totalDiscountAmount: 0,
        totalSocialFeeAmount: 0,
        totalMercadoPagoFeeAmount: 0,
        totalAmount: 1000,
        totalAmountWithMercadoPagoFee: 1000,
        socialFeeAmount: 0,
        socialFeeParticipants: [],
        socialFeePaymentLines: [],
        socialFeeMonths: 1,
        validatedItems: [
          {
            activityId: 'activity-1',
            target: 'self',
            targetLabel: 'Para mí',
            groupId: 'group-1',
          },
        ],
      },
    });

    expect(result).toEqual({
      payment: { id: 'payment-1', status: 'PENDING' },
    });
    expect(tx.activityParticipant.upsert).not.toHaveBeenCalled();
    expect(tx.activityGroupMember.upsert).not.toHaveBeenCalled();
    expect(tx.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING',
          rawData: expect.objectContaining({
            validatedItems: [
              expect.objectContaining({
                activityId: 'activity-1',
                groupId: 'group-1',
              }),
            ],
          }),
        }),
      })
    );
  });

  it('cancels the order and items when rejecting a pending manual transfer', async () => {
    mockPrisma.payment.findFirst.mockResolvedValueOnce({
      id: 'payment-1',
      orderId: 'order-1',
      provider: 'MANUAL_TRANSFER',
      status: 'PENDING',
      rawData: null,
    });

    const tx = {
      order: {
        update: jest.fn().mockResolvedValue({ id: 'order-1' }),
      },
      orderItem: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      payment: {
        update: jest.fn().mockResolvedValue({
          id: 'payment-1',
          status: 'REJECTED',
        }),
      },
    };
    mockPrisma.$transaction.mockImplementation((arg: unknown) => {
      if (typeof arg === 'function') return arg(tx);
      return Promise.resolve(arg);
    });

    const result = await rejectManualPayment({
      id: 'payment-1',
      reviewer: {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
      },
      comment: 'Comprobante inválido',
    });

    expect(result).toEqual({
      payment: { id: 'payment-1', status: 'REJECTED' },
    });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'CANCELLED' },
    });
    expect(tx.orderItem.updateMany).toHaveBeenCalledWith({
      where: { orderId: 'order-1' },
      data: { status: 'CANCELLED' },
    });
  });
});
