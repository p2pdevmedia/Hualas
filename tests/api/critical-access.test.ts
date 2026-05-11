/**
 * @jest-environment node
 */

const mockGetServerSession = jest.fn();
const mockFamilyGroupFindFirst = jest.fn();
const mockOrderCreateDraft = jest.fn();
const mockOrderAddItem = jest.fn();
const mockOrderConfirm = jest.fn();
const mockOrderCancel = jest.fn();
const mockPaymentCreate = jest.fn();
const mockPaymentApprove = jest.fn();
const mockPaymentReject = jest.fn();

jest.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    familyGroup: {
      findFirst: (...args: unknown[]) => mockFamilyGroupFindFirst(...args),
    },
  },
}));

jest.mock('@/lib/services/order-service', () => ({
  orderService: {
    createDraftOrder: (...args: unknown[]) => mockOrderCreateDraft(...args),
    addOrderItem: (...args: unknown[]) => mockOrderAddItem(...args),
    confirmOrder: (...args: unknown[]) => mockOrderConfirm(...args),
    cancelOrder: (...args: unknown[]) => mockOrderCancel(...args),
  },
}));

jest.mock('@/lib/services/payment-service', () => ({
  paymentService: {
    createPaymentForOrder: (...args: unknown[]) => mockPaymentCreate(...args),
    approvePayment: (...args: unknown[]) => mockPaymentApprove(...args),
    rejectPayment: (...args: unknown[]) => mockPaymentReject(...args),
  },
}));

import { GET as familyGroupGET } from '@/app/api/family-groups/[id]/route';
import { POST as draftOrderPOST } from '@/app/api/orders/draft/route';
import { POST as orderItemPOST } from '@/app/api/orders/[id]/items/route';
import { POST as orderConfirmPOST } from '@/app/api/orders/[id]/confirm/route';
import { POST as orderCancelPOST } from '@/app/api/orders/[id]/cancel/route';
import { POST as orderPaymentPOST } from '@/app/api/orders/[id]/payments/route';
import { POST as paymentApprovePOST } from '@/app/api/payments/[id]/approve/route';
import { POST as paymentRejectPOST } from '@/app/api/payments/[id]/reject/route';

function session(role: string, id = 'user_1') {
  return {
    user: {
      id,
      role,
      activeRole: role,
    },
  };
}

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('family group access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires a logged-in user', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await familyGroupGET(new Request('http://localhost'), {
      params: { id: 'family_1' },
    });

    expect(response.status).toBe(401);
    expect(mockFamilyGroupFindFirst).not.toHaveBeenCalled();
  });

  it('forbids logged-in users outside the family', async () => {
    mockGetServerSession.mockResolvedValue(session('MEMBER', 'outsider'));
    mockFamilyGroupFindFirst.mockResolvedValue(null);

    const response = await familyGroupGET(new Request('http://localhost'), {
      params: { id: 'family_1' },
    });

    expect(response.status).toBe(403);
    expect(mockFamilyGroupFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'family_1',
          OR: expect.arrayContaining([
            { responsibleUserId: 'outsider' },
            { members: { some: { memberId: 'outsider' } } },
          ]),
        }),
      })
    );
  });

  it('returns only safe family fields for a family participant', async () => {
    mockGetServerSession.mockResolvedValue(session('MEMBER', 'member_1'));
    mockFamilyGroupFindFirst.mockResolvedValue({
      id: 'family_1',
      name: 'Familia Test',
      responsibleUserId: 'parent_1',
      responsibleName: 'Madre Test',
      responsibleEmail: 'madre@example.com',
      responsiblePhone: '2944000000',
      members: [
        {
          id: 'membership_1',
          memberId: 'member_1',
          relationship: 'PARENT',
          isPaymentResponsible: false,
          member: {
            id: 'member_1',
            name: 'Tutor',
            lastName: 'Test',
            email: 'tutor@example.com',
          },
        },
      ],
    });

    const response = await familyGroupGET(new Request('http://localhost'), {
      params: { id: 'family_1' },
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(JSON.stringify(payload)).not.toContain('password');
    expect(JSON.stringify(payload)).not.toContain('allergies');
    expect(mockFamilyGroupFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          members: expect.objectContaining({
            select: expect.objectContaining({
              member: expect.objectContaining({
                select: {
                  id: true,
                  name: true,
                  lastName: true,
                  email: true,
                },
              }),
            }),
          }),
        }),
      })
    );
  });

  it('allows accounting users without family membership', async () => {
    mockGetServerSession.mockResolvedValue(session('COUNTER', 'counter_1'));
    mockFamilyGroupFindFirst.mockResolvedValue({ id: 'family_1', members: [] });

    const response = await familyGroupGET(new Request('http://localhost'), {
      params: { id: 'family_1' },
    });

    expect(response.status).toBe(200);
    expect(mockFamilyGroupFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'family_1' } })
    );
  });
});

describe('legacy order and payment access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrderCreateDraft.mockResolvedValue({ id: 'order_1' });
    mockOrderAddItem.mockResolvedValue({ id: 'item_1' });
    mockOrderConfirm.mockResolvedValue({
      id: 'order_1',
      status: 'PENDING_PAYMENT',
    });
    mockOrderCancel.mockResolvedValue({ id: 'order_1', status: 'CANCELLED' });
    mockPaymentCreate.mockResolvedValue({ id: 'payment_1' });
    mockPaymentApprove.mockResolvedValue({
      id: 'payment_1',
      status: 'APPROVED',
    });
    mockPaymentReject.mockResolvedValue({
      id: 'payment_1',
      status: 'REJECTED',
    });
  });

  it('rejects unauthenticated legacy order creation', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await draftOrderPOST(
      jsonRequest({ responsibleName: 'A' })
    );

    expect(response.status).toBe(401);
    expect(mockOrderCreateDraft).not.toHaveBeenCalled();
  });

  it('rejects members on legacy order and payment mutations', async () => {
    mockGetServerSession.mockResolvedValue(session('MEMBER'));

    const responses = await Promise.all([
      draftOrderPOST(jsonRequest({})),
      orderItemPOST(jsonRequest({}), { params: { id: 'order_1' } }),
      orderConfirmPOST(jsonRequest({}), { params: { id: 'order_1' } }),
      orderCancelPOST(jsonRequest({}), { params: { id: 'order_1' } }),
      orderPaymentPOST(jsonRequest({ amount: 10, provider: 'CASH' }), {
        params: { id: 'order_1' },
      }),
      paymentApprovePOST(jsonRequest({}), { params: { id: 'payment_1' } }),
      paymentRejectPOST(jsonRequest({}), { params: { id: 'payment_1' } }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([
      403, 403, 403, 403, 403, 403, 403,
    ]);
    expect(mockOrderCreateDraft).not.toHaveBeenCalled();
    expect(mockOrderAddItem).not.toHaveBeenCalled();
    expect(mockOrderConfirm).not.toHaveBeenCalled();
    expect(mockOrderCancel).not.toHaveBeenCalled();
    expect(mockPaymentCreate).not.toHaveBeenCalled();
    expect(mockPaymentApprove).not.toHaveBeenCalled();
    expect(mockPaymentReject).not.toHaveBeenCalled();
  });

  it('allows counters and admins on legacy order and payment mutations', async () => {
    mockGetServerSession
      .mockResolvedValueOnce(session('COUNTER'))
      .mockResolvedValueOnce(session('ADMIN'))
      .mockResolvedValueOnce(session('SUPER_ADMIN'));

    const createResponse = await draftOrderPOST(
      jsonRequest({ responsibleName: 'A', periodMonth: 5, periodYear: 2026 })
    );
    const approveResponse = await paymentApprovePOST(jsonRequest({}), {
      params: { id: 'payment_1' },
    });
    const rejectResponse = await paymentRejectPOST(jsonRequest({}), {
      params: { id: 'payment_2' },
    });

    expect(createResponse.status).toBe(200);
    expect(approveResponse.status).toBe(200);
    expect(rejectResponse.status).toBe(200);
    expect(mockOrderCreateDraft).toHaveBeenCalledTimes(1);
    expect(mockPaymentApprove).toHaveBeenCalledWith('payment_1');
    expect(mockPaymentReject).toHaveBeenCalledWith('payment_2');
  });
});
