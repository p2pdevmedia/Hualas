/**
 * @jest-environment node
 */

const mockGetServerSession = jest.fn();
const mockUserFindMany = jest.fn();
const mockMercadoPagoNotificationCreate = jest.fn();
const mockActivityParticipantUpsert = jest.fn();
const mockPaymentFindUnique = jest.fn();
const mockPaymentGet = jest.fn();
const mockRegisterActivityParticipantPayment = jest.fn();
const mockSyncMercadoPagoApprovedPayment = jest.fn();

jest.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
      findUnique: jest.fn(),
    },
    activity: {
      findUnique: jest.fn(),
    },
    mercadoPagoNotification: {
      create: (...args: unknown[]) =>
        mockMercadoPagoNotificationCreate(...args),
    },
    activityParticipant: {
      upsert: (...args: unknown[]) => mockActivityParticipantUpsert(...args),
    },
    payment: {
      findUnique: (...args: unknown[]) => mockPaymentFindUnique(...args),
    },
  },
}));

jest.mock('@/lib/mercadopago', () => ({
  getMercadoPagoEnvironment: () => 'testing',
  getMercadoPagoCredentials: () => ({
    accessToken: 'mp-access-token',
    environment: 'testing',
  }),
}));

jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn(),
  Payment: jest.fn().mockImplementation(() => ({
    get: (...args: unknown[]) => mockPaymentGet(...args),
  })),
}));

jest.mock('@/lib/activity-payments', () => ({
  registerActivityParticipantPayment: (...args: unknown[]) =>
    mockRegisterActivityParticipantPayment(...args),
}));

jest.mock('@/lib/social-fee', () => ({
  parseSocialFeeParticipants: jest.fn().mockReturnValue([]),
  registerSocialFeePayment: jest.fn(),
}));

jest.mock('@/lib/services/mercado-pago-accounting-service', () => {
  const actual = jest.requireActual(
    '@/lib/services/mercado-pago-accounting-service'
  );
  return {
    ...actual,
    syncMercadoPagoApprovedPayment: (...args: unknown[]) =>
      mockSyncMercadoPagoApprovedPayment(...args),
  };
});

jest.mock('@/lib/notifications/notification-service', () => ({
  notifyOrderPaymentApproved: jest.fn(),
  notifyActivityPaymentApproved: jest.fn(),
  notifyActivityCapacityFull: jest.fn(),
}));

import { GET as usersGET } from '@/app/api/users/route';
import { POST as activityPaymentPOST } from '@/app/api/activities/[id]/payment/route';
import { POST as mercadoPagoWebhookPOST } from '@/app/api/mercadopago/notifications/route';
import crypto from 'crypto';

function session(role: string, id = 'user_1') {
  return {
    user: {
      id,
      role,
      activeRole: role,
      roles: role === 'MEMBER' ? ['MEMBER'] : ['MEMBER', role],
    },
  };
}

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function signedWebhookRequest(url: string, body: unknown, secret: string) {
  const requestId = 'request-1';
  const timestamp = Date.now().toString();
  const parsedUrl = new URL(url);
  const dataId = parsedUrl.searchParams.get('data.id') ?? '';
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');

  return new Request(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-request-id': requestId,
      'x-signature': `ts=${timestamp},v1=${signature}`,
    },
    body: JSON.stringify(body),
  });
}

describe('admin API access hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MP_WEBHOOK_SECRET;
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
  });

  it('forbids members from listing all users', async () => {
    mockGetServerSession.mockResolvedValue(session('MEMBER'));
    mockUserFindMany.mockResolvedValue([]);

    const response = await usersGET();

    expect(response.status).toBe(403);
    expect(mockUserFindMany).not.toHaveBeenCalled();
  });

  it('does not register an activity payment when the Mercado Pago reference belongs to another user', async () => {
    mockGetServerSession.mockResolvedValue(session('MEMBER', 'user_1'));
    mockPaymentGet.mockResolvedValue({
      id: 'payment_1',
      status: 'approved',
      external_reference: 'activity_1:other_user',
      transaction_amount: 100,
      date_approved: '2026-05-12T10:00:00.000Z',
      metadata: {},
    });

    const response = await activityPaymentPOST(
      jsonRequest('http://localhost/api/activities/activity_1/payment', {
        paymentId: 'payment_1',
      }),
      { params: { id: 'activity_1' } }
    );

    expect(response.status).toBe(403);
    expect(mockActivityParticipantUpsert).not.toHaveBeenCalled();
    expect(mockRegisterActivityParticipantPayment).not.toHaveBeenCalled();
  });

  it('rejects unsigned Mercado Pago webhooks before persisting or processing them', async () => {
    process.env.MP_WEBHOOK_SECRET = 'webhook-secret';

    const response = await mercadoPagoWebhookPOST(
      jsonRequest(
        'http://localhost/api/mercadopago/notifications?type=payment&data.id=payment_1',
        { type: 'payment', data: { id: 'payment_1' } }
      ) as any
    );

    expect(response.status).toBe(401);
    expect(mockMercadoPagoNotificationCreate).not.toHaveBeenCalled();
    expect(mockPaymentGet).not.toHaveBeenCalled();
  });

  it('does not reprocess an already synchronized Mercado Pago payment webhook', async () => {
    process.env.MP_WEBHOOK_SECRET = 'webhook-secret';
    mockPaymentFindUnique.mockResolvedValue({ id: 'mp-payment:payment_1' });
    mockMercadoPagoNotificationCreate.mockResolvedValue({
      id: 'notification_1',
    });

    const response = await mercadoPagoWebhookPOST(
      signedWebhookRequest(
        'http://localhost/api/mercadopago/notifications?type=payment&data.id=payment_1',
        { type: 'payment', data: { id: 'payment_1' } },
        'webhook-secret'
      ) as any
    );

    expect(response.status).toBe(200);
    expect(mockMercadoPagoNotificationCreate).toHaveBeenCalledTimes(1);
    expect(mockPaymentGet).not.toHaveBeenCalled();
    expect(mockActivityParticipantUpsert).not.toHaveBeenCalled();
  });
});
