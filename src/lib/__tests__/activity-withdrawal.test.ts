/**
 * @jest-environment node
 */

const mockFindFirst = jest.fn();
const mockDeleteMany = jest.fn();
const mockUpdate = jest.fn();
const mockTransaction = jest.fn(async (callback: (tx: unknown) => unknown) =>
  callback({
    activityParticipant: {
      findFirst: mockFindFirst,
      update: mockUpdate,
    },
    activityGroupMember: {
      deleteMany: mockDeleteMany,
    },
  })
);

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: (callback: (tx: unknown) => unknown) =>
      mockTransaction(callback),
  },
}));

import {
  isActivityParticipantBillableForPeriod,
  withdrawActivityParticipant,
} from '@/lib/activity-withdrawal';

describe('activity withdrawal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks an owned active participant as withdrawn without deleting payment history', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'participant_1',
      activityId: 'activity_1',
      userId: 'user_1',
      childId: null,
    });
    mockUpdate.mockResolvedValue({
      id: 'participant_1',
      status: 'WITHDRAWN',
      withdrawnAt: new Date('2026-05-11T12:00:00.000Z'),
    });

    const result = await withdrawActivityParticipant({
      activityId: 'activity_1',
      participantId: 'participant_1',
      userId: 'user_1',
      now: new Date('2026-05-11T12:00:00.000Z'),
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 'participant_1',
        status: 'WITHDRAWN',
      })
    );
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'participant_1',
          activityId: 'activity_1',
          status: 'ACTIVE',
          OR: expect.arrayContaining([
            { userId: 'user_1' },
            { child: { userId: 'user_1' } },
          ]),
        }),
      })
    );
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { activityParticipantId: 'participant_1' },
    });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'participant_1' },
        data: {
          status: 'WITHDRAWN',
          withdrawnAt: new Date('2026-05-11T12:00:00.000Z'),
        },
      })
    );
  });

  it('does not withdraw participants outside the current family', async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await withdrawActivityParticipant({
      activityId: 'activity_1',
      participantId: 'participant_1',
      userId: 'other_user',
      now: new Date('2026-05-11T12:00:00.000Z'),
    });

    expect(result).toBeNull();
    expect(mockDeleteMany).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('keeps a withdrawn participant billable only for the month where the withdrawal happened', () => {
    const participant = {
      status: 'WITHDRAWN' as const,
      withdrawnAt: new Date('2026-05-11T12:00:00.000Z'),
    };

    expect(
      isActivityParticipantBillableForPeriod(
        participant,
        new Date('2026-05-01T00:00:00.000Z')
      )
    ).toBe(true);
    expect(
      isActivityParticipantBillableForPeriod(
        participant,
        new Date('2026-06-01T00:00:00.000Z')
      )
    ).toBe(false);
  });
});
