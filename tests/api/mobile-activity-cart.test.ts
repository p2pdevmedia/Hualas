/**
 * @jest-environment node
 */

jest.mock('@/lib/mobile-auth', () => ({
  getMobileSessionFromRequest: jest.fn(),
}));

jest.mock('@/lib/cart-checkout', () => ({
  buildCartQuote: jest.fn(),
  buildCartQuoteErrorResponse: jest.fn().mockReturnValue(null),
  serializeActivityMonthlyPaymentLines: jest.fn().mockReturnValue('[]'),
  toMercadoPagoItems: jest.fn().mockReturnValue([
    {
      id: 'activity_1',
      title: 'Escalada',
      quantity: 1,
      unit_price: 5000,
      currency_id: 'ARS',
      category_id: 'services',
    },
  ]),
}));

jest.mock('@/lib/services/manual-payment-service', () => ({
  createManualPaymentCheckout: jest.fn(),
}));

jest.mock('@/lib/mercadopago', () => ({
  getMercadoPagoCheckoutSettings: jest.fn().mockReturnValue({
    autoReturn: 'approved',
    binaryMode: false,
    expiresInMinutes: 60,
    maxInstallments: 1,
    excludedPaymentMethodIds: [],
    excludedPaymentTypeIds: [],
  }),
  getMercadoPagoCredentials: jest.fn().mockReturnValue({
    accessToken: 'access-token',
    environment: 'testing',
  }),
  getMercadoPagoNotificationUrl: jest
    .fn()
    .mockReturnValue('https://hualas.example/api/mercadopago/notifications'),
  getMercadoPagoReturnBaseUrl: jest
    .fn()
    .mockReturnValue('https://hualas.example'),
}));

jest.mock('mercadopago', () => {
  const create = jest.fn().mockResolvedValue({
    init_point: 'https://mercadopago.example.com/checkout',
    sandbox_init_point: 'https://mercadopago.example.com/sandbox',
  });

  return {
    MercadoPagoConfig: jest.fn(),
    Preference: jest.fn().mockImplementation(() => ({ create })),
    __mockPreferenceCreate: create,
  };
});

jest.mock('@/lib/family-access', () => ({
  getAccessibleChildOwnerIds: jest.fn().mockResolvedValue(['user_1']),
  getAccessibleChildrenWhere: jest
    .fn()
    .mockResolvedValue({ userId: { in: ['user_1'] } }),
}));

jest.mock('@/lib/participant-profile-check', () => ({
  checkUserProfile: jest
    .fn()
    .mockReturnValue({ valid: true, missingFields: [] }),
  checkChildProfile: jest
    .fn()
    .mockReturnValue({ valid: true, missingFields: [] }),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    activity: {
      findMany: jest.fn(),
    },
    activityParticipant: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    child: {
      findMany: jest.fn(),
    },
  },
}));

import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { buildCartQuote } from '@/lib/cart-checkout';
import { createManualPaymentCheckout } from '@/lib/services/manual-payment-service';
import { prisma } from '@/lib/prisma';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import { POST as mobileCartCheckoutPOST } from '@/app/api/mobile/activities/cart/checkout/route';
import { POST as mobileCartQuotePOST } from '@/app/api/mobile/activities/cart/quote/route';
import { GET as mobileAvailableActivitiesGET } from '@/app/api/mobile/activities/available/route';

const mockGetMobileSessionFromRequest =
  getMobileSessionFromRequest as unknown as jest.Mock;
const mockBuildCartQuote = buildCartQuote as unknown as jest.Mock;
const mockCreateManualPaymentCheckout =
  createManualPaymentCheckout as unknown as jest.Mock;
const mockPrisma = prisma as unknown as {
  activity: { findMany: jest.Mock };
  activityParticipant: { findMany: jest.Mock };
  user: { findUnique: jest.Mock };
  child: { findMany: jest.Mock };
};
const mockGetAccessibleChildOwnerIds =
  getAccessibleChildOwnerIds as unknown as jest.Mock;

const SESSION = {
  id: 'session_1',
  userId: 'user_1',
  appRole: 'MEMBER',
  user: {
    id: 'user_1',
    email: 'member@hualas.com',
    name: 'Marta',
    lastName: 'Paz',
  },
};

const QUOTE = {
  activityLines: [
    {
      id: 'activity_1',
      name: 'Escalada',
      amount: 5000,
      targetLabel: 'Para mí',
      activityDayLabel: null,
    },
  ],
  activityMonthlyPaymentLines: [],
  discountLines: [],
  socialFeeLines: [],
  mercadoPagoFeeLines: [],
  totalActivityAmount: 5000,
  totalActivityMonthlyPaymentAmount: 0,
  totalDiscountAmount: 0,
  totalSocialFeeAmount: 0,
  totalMercadoPagoFeeAmount: 0,
  totalAmount: 5000,
  totalAmountWithMercadoPagoFee: 5000,
  socialFeeAmount: 0,
  socialFeeParticipants: [],
  socialFeePaymentLines: [],
  socialFeeMonths: 1,
  validatedItems: [
    {
      activityId: 'activity_1',
      target: 'self',
      targetLabel: 'Para mí',
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMobileSessionFromRequest.mockResolvedValue(SESSION);
  mockBuildCartQuote.mockResolvedValue(QUOTE);
  mockCreateManualPaymentCheckout.mockResolvedValue({
    payment: { id: 'payment_1', orderId: 'order_1' },
  });
  mockGetAccessibleChildOwnerIds.mockResolvedValue(['user_1']);
  mockPrisma.activity.findMany.mockResolvedValue([
    {
      id: 'activity_1',
      name: 'Escalada',
      date: new Date('2026-04-01T00:00:00.000Z'),
      endDate: new Date('2026-06-30T00:00:00.000Z'),
      activityType: 'TEMPORARY',
      frequency: 'ONE_TIME',
      image: null,
      description: 'Actividad de prueba',
      price: 5000,
      participants: [],
      groups: [],
      days: [],
      _count: { participants: 0 },
    },
    {
      id: 'activity_2',
      name: 'Trekking',
      date: new Date('2026-06-01T00:00:00.000Z'),
      endDate: new Date('2026-06-30T00:00:00.000Z'),
      activityType: 'ANNUAL',
      frequency: 'WEEKLY',
      image: null,
      description: null,
      price: 7000,
      participants: [],
      groups: [
        {
          id: 'group_1',
          name: 'Grupo A',
          description: null,
          capacity: 10,
          minAge: null,
          maxAge: null,
          _count: { members: 10 },
        },
      ],
      days: [],
      _count: { participants: 10 },
    },
  ]);
  mockPrisma.activityParticipant.findMany.mockResolvedValue([]);
  mockPrisma.user.findUnique.mockResolvedValue({
    name: 'Marta',
    lastName: 'Paz',
    dni: '12345678',
    birthDate: new Date('2000-01-01T00:00:00.000Z'),
    address: 'Calle 1',
    phone: '123456789',
  });
  mockPrisma.child.findMany.mockResolvedValue([]);
});

describe('mobile activity cart routes', () => {
  it('returns only open activities in the catalog', async () => {
    const response = await mobileAvailableActivitiesGET(
      new Request('http://localhost/api/mobile/activities/available', {
        headers: {
          authorization: 'Bearer test-token',
        },
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.activities).toHaveLength(1);
    expect(payload.activities[0].name).toBe('Escalada');
  });

  it('returns a quote for the mobile cart', async () => {
    const response = await mobileCartQuotePOST(
      new Request('http://localhost/api/mobile/activities/cart/quote', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              activityId: 'activity_1',
              target: 'self',
              targetLabel: 'Para mí',
            },
          ],
        }),
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.totalAmount).toBe(5000);
    expect(mockBuildCartQuote).toHaveBeenCalledWith({
      userId: 'user_1',
      items: [
        {
          activityId: 'activity_1',
          target: 'self',
          targetLabel: 'Para mí',
        },
      ],
    });
  });

  it('registers a manual payment with proof', async () => {
    const formData = new FormData();
    formData.append(
      'items',
      JSON.stringify([
        {
          activityId: 'activity_1',
          target: 'self',
          targetLabel: 'Para mí',
        },
      ])
    );
    formData.append('paymentMethod', 'MANUAL_TRANSFER');
    formData.append(
      'proof',
      new File(['proof'], 'proof.jpg', { type: 'image/jpeg' })
    );

    const response = await mobileCartCheckoutPOST(
      new Request('http://localhost/api/mobile/activities/cart/checkout', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
        },
        body: formData,
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(mockCreateManualPaymentCheckout).toHaveBeenCalled();
  });

  it('returns a Mercado Pago redirect for card checkout', async () => {
    const response = await mobileCartCheckoutPOST(
      new Request('http://localhost/api/mobile/activities/cart/checkout', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethod: 'MERCADO_PAGO',
          items: [
            {
              activityId: 'activity_1',
              target: 'self',
              targetLabel: 'Para mí',
            },
          ],
        }),
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.redirectUrl).toContain('mercadopago.example.com');
  });
});
