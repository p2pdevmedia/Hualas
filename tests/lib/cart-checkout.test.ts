/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    activity: {
      findMany: jest.fn(),
    },
    familyGroup: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
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
  familyGroup: { findMany: jest.Mock };
  user: { findUnique: jest.Mock; findMany: jest.Mock };
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
        days: [],
        groups: [],
      },
    ]);
    mockPrisma.familyGroup.findMany.mockResolvedValue([
      { responsibleUserId: 'user_1' },
    ]);
    mockPrisma.child.findMany.mockResolvedValue([
      { id: 'child_1', name: 'Ana', lastName: 'Lopez' },
      { id: 'child_2', name: 'Beto', lastName: 'Lopez' },
    ]);
    mockPrisma.user.findUnique.mockResolvedValue({
      birthDate: new Date('2010-01-01T00:00:00Z'),
    });
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: 'user_1',
        children: [
          { id: 'child_1' },
          { id: 'child_2' },
        ],
      },
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
    ).toBe(-10);
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
    expect(quote.totalAmount).toBe(12500);
  });

  it('permite cotizar solo cuota social con el carrito vacío', async () => {
    const quote = await buildCartQuote({
      userId: 'user_1',
      items: [],
      socialFeeOnly: true,
    });

    expect(quote.activityLines).toEqual([]);
    expect(quote.socialFeeLines).toHaveLength(3);
    expect(quote.totalActivityAmount).toBe(0);
    expect(quote.totalSocialFeeAmount).toBe(7500);
    expect(quote.totalAmount).toBe(7500);
    expect(quote.validatedItems).toEqual([]);
  });

  it('incluye automaticamente cuotas sociales activas aunque la actividad sea para otra persona', async () => {
    const quote = await buildCartQuote({
      userId: 'user_1',
      items: [
        { activityId: 'activity_1', target: 'child_1', targetLabel: 'Ana' },
      ],
    });

    expect(quote.socialFeeParticipants).toEqual([
      { userId: 'user_1', childId: 'child_1' },
      { userId: 'user_1', childId: null },
      { userId: 'user_1', childId: 'child_2' },
    ]);
    expect(quote.totalSocialFeeAmount).toBe(7500);
    expect(quote.totalAmount).toBe(12500);
  });
});
