/**
 * @jest-environment node
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@vercel/blob', () => ({
  put: jest
    .fn()
    .mockResolvedValue({ url: 'https://blob.example.com/proof.pdf' }),
  del: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/manual-payments', () => ({
  validateManualPaymentFile: jest.fn().mockReturnValue(null),
  createManualPaymentRawData: jest.fn().mockReturnValue({}),
  getManualPaymentRawData: jest.fn().mockReturnValue({}),
  getManualPaymentReviews: jest.fn().mockReturnValue([]),
}));

const mockOrderItemCreate = jest.fn().mockResolvedValue({ id: 'item_1' });
const mockOrderCreate = jest.fn().mockResolvedValue({ id: 'order_1' });
const mockPaymentCreate = jest
  .fn()
  .mockResolvedValue({ id: 'payment_1', orderId: 'order_1' });
const mockParticipantUpsert = jest.fn().mockResolvedValue({});
const mockBillableConceptUpsert = jest
  .fn()
  .mockResolvedValueOnce({ id: 'concept_activity' })
  .mockResolvedValueOnce({ id: 'concept_social' })
  .mockResolvedValueOnce({ id: 'concept_discount' });

const mockTx = {
  order: { create: mockOrderCreate },
  orderItem: { create: mockOrderItemCreate },
  activityParticipant: { upsert: mockParticipantUpsert },
  payment: { create: mockPaymentCreate },
  billableConcept: { upsert: mockBillableConceptUpsert },
};

jest.mock('@/lib/prisma', () => ({
  prisma: {
    // $transaction is called two ways:
    // 1. With an array of promises (getBillableConceptIds)
    // 2. With a callback function (the main order transaction)
    $transaction: jest.fn((arg: unknown) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      if (typeof arg === 'function') {
        return (arg as (tx: typeof mockTx) => Promise<unknown>)(mockTx);
      }
      return Promise.resolve();
    }),
    billableConcept: {
      upsert: jest
        .fn()
        .mockResolvedValueOnce({ id: 'concept_activity' })
        .mockResolvedValueOnce({ id: 'concept_social' })
        .mockResolvedValueOnce({ id: 'concept_discount' }),
    },
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { createManualPaymentCheckout } from '@/lib/services/manual-payment-service';
import type { CartQuote } from '@/lib/cart-checkout';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeProofFile() {
  return new File(['dummy'], 'proof.pdf', { type: 'application/pdf' });
}

const USER = { id: 'user_1', email: 'test@hualas.com', name: 'Test User' };
const CHILD_ID = 'child_abc';
const ACTIVITY_ID = 'act_xyz';

function baseQuote(overrides: Partial<CartQuote> = {}): CartQuote {
  return {
    activityLines: [
      { id: ACTIVITY_ID, name: 'Kayak', amount: 5000, targetLabel: 'Para mí' },
    ],
    discountLines: [],
    socialFeeLines: [],
    totalActivityAmount: 5000,
    totalDiscountAmount: 0,
    totalSocialFeeAmount: 0,
    totalAmount: 5000,
    socialFeeAmount: 0,
    socialFeeParticipants: [],
    validatedItems: [{ activityId: ACTIVITY_ID, target: 'self' }],
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Reset billableConcept upsert sequence each test
  const { prisma } = require('@/lib/prisma');
  (prisma.billableConcept.upsert as jest.Mock)
    .mockResolvedValueOnce({ id: 'concept_activity' })
    .mockResolvedValueOnce({ id: 'concept_social' })
    .mockResolvedValueOnce({ id: 'concept_discount' });
});

describe('createManualPaymentCheckout', () => {
  it('crea un OrderItem con memberId del usuario para registro propio', async () => {
    const quote = baseQuote();
    await createManualPaymentCheckout({
      user: USER,
      quote,
      proofFile: makeProofFile(),
    });

    const activityCall = mockOrderItemCreate.mock.calls.find(
      ([{ data }]) => data.activityId === ACTIVITY_ID
    );
    expect(activityCall).toBeDefined();
    expect(activityCall![0].data.memberId).toBe(USER.id);
  });

  it('crea un OrderItem con memberId null para registro de hijo', async () => {
    const quote = baseQuote({
      activityLines: [
        { id: ACTIVITY_ID, name: 'Kayak', amount: 5000, targetLabel: 'Hijo' },
      ],
      validatedItems: [{ activityId: ACTIVITY_ID, target: CHILD_ID }],
    });

    await createManualPaymentCheckout({
      user: USER,
      quote,
      proofFile: makeProofFile(),
    });

    const activityCall = mockOrderItemCreate.mock.calls.find(
      ([{ data }]) => data.activityId === ACTIVITY_ID
    );
    expect(activityCall).toBeDefined();
    expect(activityCall![0].data.memberId).toBeNull();
  });

  it('no conflicto: misma actividad para usuario y su hijo crea dos OrderItems con memberId distintos', async () => {
    const quote = baseQuote({
      activityLines: [
        {
          id: ACTIVITY_ID,
          name: 'Kayak',
          amount: 5000,
          targetLabel: 'Para mí',
        },
        { id: ACTIVITY_ID, name: 'Kayak', amount: 5000, targetLabel: 'Hijo' },
      ],
      totalActivityAmount: 10000,
      totalAmount: 10000,
      validatedItems: [
        { activityId: ACTIVITY_ID, target: 'self' },
        { activityId: ACTIVITY_ID, target: CHILD_ID },
      ],
    });

    await createManualPaymentCheckout({
      user: USER,
      quote,
      proofFile: makeProofFile(),
    });

    const activityCalls = mockOrderItemCreate.mock.calls.filter(
      ([{ data }]) => data.activityId === ACTIVITY_ID
    );
    expect(activityCalls).toHaveLength(2);

    const memberIds = activityCalls.map(([{ data }]) => data.memberId);
    expect(memberIds).toContain(USER.id);
    expect(memberIds).toContain(null);
  });

  it('multiples cuotas sociales se crean como un solo OrderItem agrupado', async () => {
    const quote = baseQuote({
      socialFeeLines: [
        {
          participant: { userId: USER.id, childId: null },
          amount: 3000,
          label: 'Cuota social - Test User',
        },
        {
          participant: { userId: USER.id, childId: CHILD_ID },
          amount: 3000,
          label: 'Cuota social - Hijo',
        },
      ],
      totalSocialFeeAmount: 6000,
      totalAmount: 11000,
      socialFeeAmount: 3000,
      socialFeeParticipants: [
        { userId: USER.id, childId: null },
        { userId: USER.id, childId: CHILD_ID },
      ],
    });

    await createManualPaymentCheckout({
      user: USER,
      quote,
      proofFile: makeProofFile(),
    });

    const socialFeeCalls = mockOrderItemCreate.mock.calls.filter(
      ([{ data }]) => data.billableConceptId === 'concept_social'
    );
    expect(socialFeeCalls).toHaveLength(1);
    expect(socialFeeCalls[0][0].data.total).toBe(6000);
    expect(socialFeeCalls[0][0].data.quantity).toBe(2);
  });

  it('crea un OrderItem de descuento familiar cuando corresponde', async () => {
    const quote = baseQuote({
      activityLines: [
        { id: ACTIVITY_ID, name: 'Kayak', amount: 5000, targetLabel: 'Hijo 1' },
        {
          id: `${ACTIVITY_ID}_2`,
          name: 'Kayak',
          amount: 5000,
          targetLabel: 'Hijo 2',
        },
      ],
      totalActivityAmount: 10000,
      totalDiscountAmount: 1000,
      totalAmount: 9000,
      validatedItems: [
        { activityId: ACTIVITY_ID, target: 'child_1' },
        { activityId: `${ACTIVITY_ID}_2`, target: 'child_2' },
      ],
      discountLines: [{ amount: 1000, label: 'Descuento familiar' }],
    });

    await createManualPaymentCheckout({
      user: USER,
      quote,
      proofFile: makeProofFile(),
    });

    const discountCall = mockOrderItemCreate.mock.calls.find(
      ([{ data }]) => data.billableConceptId === 'concept_discount'
    );

    expect(discountCall).toBeDefined();
    expect(discountCall![0].data.description).toBe('Descuento familiar');
    expect(discountCall![0].data.total).toBe(-1000);
    expect(discountCall![0].data.unitPrice).toBe(-1000);
  });

  it('retorna error si el archivo de comprobante no es válido', async () => {
    const { validateManualPaymentFile } = require('@/lib/manual-payments');
    (validateManualPaymentFile as jest.Mock).mockReturnValueOnce(
      'Formato no permitido'
    );

    const result = await createManualPaymentCheckout({
      user: USER,
      quote: baseQuote(),
      proofFile: makeProofFile(),
    });

    expect(result).toEqual({ error: 'Formato no permitido', status: 400 });
    expect(mockOrderItemCreate).not.toHaveBeenCalled();
  });
});
