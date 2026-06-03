jest.mock('@/lib/activity-payments', () => ({
  registerActivityParticipantPayment: jest.fn(),
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

import { registerActivityParticipantPayment } from '@/lib/activity-payments';
import { finalizePaidActivityEnrollment } from '../activity-enrollment-finalization';

function createTx(overrides: Record<string, unknown> = {}) {
  return {
    $queryRaw: jest.fn().mockResolvedValue([]),
    activity: {
      findUnique: jest.fn().mockResolvedValue({
        price: 1000,
        groups: [{ id: 'group-1', capacity: 1 }],
      }),
    },
    activityParticipant: {
      findUnique: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      upsert: jest.fn().mockResolvedValue({ id: 'participant-1' }),
    },
    activityGroupMember: {
      count: jest.fn().mockResolvedValue(0),
      upsert: jest.fn().mockResolvedValue({ id: 'membership-1' }),
    },
    ...overrides,
  };
}

describe('finalizePaidActivityEnrollment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not activate a new participant when activity capacity is full', async () => {
    const tx = createTx({
      activityParticipant: {
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(1),
        upsert: jest.fn(),
      },
    });

    const result = await finalizePaidActivityEnrollment(
      {
        activityId: 'activity-1',
        userId: 'user-1',
        paymentReference: 'payment-1',
      },
      tx as any
    );

    expect(result).toEqual({ status: 'skipped', reason: 'activity_full' });
    expect(tx.activityParticipant.upsert).not.toHaveBeenCalled();
    expect(registerActivityParticipantPayment).not.toHaveBeenCalled();
  });

  it('does not reactivate a withdrawn participant when capacity is full', async () => {
    const tx = createTx({
      activityParticipant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'participant-1',
          status: 'WITHDRAWN',
        }),
        count: jest.fn().mockResolvedValue(1),
        upsert: jest.fn(),
      },
    });

    const result = await finalizePaidActivityEnrollment(
      {
        activityId: 'activity-1',
        userId: 'user-1',
        paymentReference: 'payment-1',
      },
      tx as any
    );

    expect(result).toEqual({ status: 'skipped', reason: 'activity_full' });
    expect(tx.activityParticipant.upsert).not.toHaveBeenCalled();
    expect(registerActivityParticipantPayment).not.toHaveBeenCalled();
  });

  it('activates a participant and group membership inside the provided transaction', async () => {
    const tx = createTx();

    const result = await finalizePaidActivityEnrollment(
      {
        activityId: 'activity-1',
        userId: 'user-1',
        childId: null,
        groupId: 'group-1',
        activityDayId: 'day-1',
        paymentReference: 'payment-1',
        paidAt: new Date('2026-06-03T10:00:00Z'),
      },
      tx as any
    );

    expect(result).toMatchObject({
      status: 'enrolled',
      participant: { id: 'participant-1' },
      created: true,
    });
    expect(tx.activityGroupMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          activityGroupId: 'group-1',
          activityParticipantId: 'participant-1',
        }),
      })
    );
    expect(registerActivityParticipantPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        activityParticipantId: 'participant-1',
        activityId: 'activity-1',
        groupId: 'group-1',
        activityDayId: 'day-1',
        paymentReference: 'payment-1',
      }),
      tx
    );
  });
});
