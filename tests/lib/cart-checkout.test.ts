/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    activity: {
      findMany: jest.fn(),
    },
    child: {
      findMany: jest.fn(),
    },
    activityParticipant: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/social-fee', () => ({
  getSocialFeeAmount: jest.fn(),
  hasSocialFeeForCurrentMonth: jest.fn(),
  normalizeSocialFeeParticipant: jest.fn(({ userId, childId }) => ({
    userId,
    childId: childId ?? null,
  })),
}));

import { prisma } from '@/lib/prisma';
import { buildCartQuote, toMercadoPagoItems } from '@/lib/cart-checkout';
import {
  getSocialFeeAmount,
  hasSocialFeeForCurrentMonth,
} from '@/lib/social-fee';

const mockPrisma = prisma as unknown as {
  activity: { findMany: jest.Mock };
  child: { findMany: jest.Mock };
  activityParticipant: { findMany: jest.Mock };
};

describe('buildCartQuote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.activity.findMany.mockResolvedValue([
      {
        id: 'activity_1',
        name: 'Escalada',
        price: 5000,
        capacity: null,
        participants: [],
      },
    ]);
    mockPrisma.child.findMany.mockResolvedValue([
      { id: 'child_1', name: 'Ana', lastName: 'Lopez' },
      { id: 'child_2', name: 'Beto', lastName: 'Lopez' },
    ]);
    mockPrisma.activityParticipant.findMany.mockResolvedValue([]);
    (getSocialFeeAmount as jest.Mock).mockResolvedValue(2500);
    (hasSocialFeeForCurrentMonth as jest.Mock).mockResolvedValue(false);
  });

  it('aplica descuento familiar del 10% cuando hay dos hijos distintos', async () => {
    const quote = await buildCartQuote({
      userId: 'user_1',
      items: [
        { activityId: 'activity_1', target: 'child_1', targetLabel: 'Ana' },
        { activityId: 'activity_1', target: 'child_2', targetLabel: 'Beto' },
        { activityId: 'activity_1', target: 'self', targetLabel: 'Titular' },
      ],
    });

    expect(quote.totalActivityAmount).toBe(15000);
    expect(quote.discountLines).toEqual([
      { amount: 1000, label: 'Descuento familiar' },
    ]);
    expect(quote.totalDiscountAmount).toBe(1000);
    expect(quote.totalSocialFeeAmount).toBe(7500);
    expect(quote.totalAmount).toBe(21500);

    const mpItems = toMercadoPagoItems(quote);
    expect(mpItems.some((item) => item.title === 'Descuento familiar')).toBe(
      true
    );
    expect(
      mpItems.find((item) => item.title === 'Descuento familiar')?.unit_price
    ).toBe(-1000);
  });

  it('no aplica descuento con un solo hijo', async () => {
    const quote = await buildCartQuote({
      userId: 'user_1',
      items: [
        { activityId: 'activity_1', target: 'child_1', targetLabel: 'Ana' },
      ],
    });

    expect(quote.discountLines).toEqual([]);
    expect(quote.totalDiscountAmount).toBe(0);
    expect(quote.totalAmount).toBe(7500);
  });
});
