jest.mock('@/lib/prisma', () => ({
  prisma: {
    child: {
      findUnique: jest.fn(),
    },
    socialFeePayment: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
    billableConcept: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  hasSocialFeeForCurrentMonth,
  registerSocialFeePayment,
} from '../social-fee';

const mockPrisma = prisma as unknown as {
  child: {
    findUnique: jest.Mock;
  };
  socialFeePayment: {
    findFirst: jest.Mock;
    upsert: jest.Mock;
  };
  user: {
    update: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe('social fee helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-06T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('checks child social fees against the canonical child owner', async () => {
    mockPrisma.child.findUnique.mockResolvedValueOnce({
      userId: 'father-user-id',
    });
    mockPrisma.socialFeePayment.findFirst.mockResolvedValueOnce({
      id: 'payment-1',
    });

    await expect(
      hasSocialFeeForCurrentMonth({
        userId: 'tutor-user-id',
        childId: 'child-1',
      })
    ).resolves.toBe(true);

    expect(mockPrisma.socialFeePayment.findFirst).toHaveBeenCalledWith({
      where: {
        periodMonth: 5,
        periodYear: 2026,
        userId: 'father-user-id',
        childId: 'child-1',
      },
      select: { id: true },
    });
  });

  it('stores child social fees under the child owner and updates that account', async () => {
    const tx = {
      child: {
        findUnique: jest.fn().mockResolvedValue({ userId: 'father-user-id' }),
      },
      socialFeePayment: {
        upsert: jest.fn().mockResolvedValue({ id: 'payment-2' }),
      },
      user: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback(tx)
    );

    await registerSocialFeePayment({
      userId: 'tutor-user-id',
      childId: 'child-1',
      amount: 2500,
      mercadoPagoPaymentId: 'mp-123',
    });

    expect(tx.child.findUnique).toHaveBeenCalledWith({
      where: { id: 'child-1' },
      select: { userId: true },
    });
    expect(tx.socialFeePayment.upsert).toHaveBeenCalledWith({
      where: {
        userId_childId_periodMonth_periodYear: {
          userId: 'father-user-id',
          childId: 'child-1',
          periodMonth: 5,
          periodYear: 2026,
        },
      },
      create: {
        userId: 'father-user-id',
        childId: 'child-1',
        periodMonth: 5,
        periodYear: 2026,
        amount: 2500,
        mercadoPagoPaymentId: 'mp-123',
      },
      update: {
        amount: 2500,
        mercadoPagoPaymentId: 'mp-123',
      },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'father-user-id' },
      data: { socialFeeActive: true },
    });
  });
});
