jest.mock('@/lib/prisma', () => ({
  prisma: {},
}));

import { registerActivityParticipantPayment } from '../activity-payments';

describe('activity payment helpers', () => {
  it('uses the provided monthly period for annual activity payments', async () => {
    const db = {
      activity: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'activity_1',
          activityType: 'ANNUAL',
          price: 120000,
        }),
      },
      activityParticipantPayment: {
        upsert: jest.fn().mockResolvedValue({ id: 'payment_1' }),
      },
    };

    await registerActivityParticipantPayment(
      {
        activityParticipantId: 'participant_1',
        activityId: 'activity_1',
        userId: 'user_1',
        childId: 'child_1',
        amount: 120000,
        paymentReference: 'manual_1',
        paidAt: new Date('2026-06-02T12:00:00Z'),
        periodMonth: 5,
        periodYear: 2026,
      },
      db as never
    );

    expect(db.activityParticipantPayment.upsert).toHaveBeenCalledWith({
      where: {
        activityParticipantId_periodMonth_periodYear: {
          activityParticipantId: 'participant_1',
          periodMonth: 5,
          periodYear: 2026,
        },
      },
      create: {
        activityParticipantId: 'participant_1',
        activityId: 'activity_1',
        userId: 'user_1',
        childId: 'child_1',
        paymentType: 'MONTHLY',
        periodMonth: 5,
        periodYear: 2026,
        amount: 120000,
        paymentReference: 'manual_1',
        paidAt: new Date('2026-06-02T12:00:00Z'),
      },
      update: {
        amount: 120000,
        paymentReference: 'manual_1',
        paidAt: new Date('2026-06-02T12:00:00Z'),
      },
    });
  });
});
