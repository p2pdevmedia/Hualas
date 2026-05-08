import {
  normalizeAccountingMovementAmount,
  getAccountingManualPaymentAmount,
  getAccountingPaymentDate,
  getFamilyGroupMemberCount,
} from '../accounting';

describe('accounting helpers', () => {
  it('normalizes legacy manual payment amounts stored in pesos', () => {
    expect(
      getAccountingManualPaymentAmount({
        amount: 18,
        order: { total: 18 },
      })
    ).toBe(1800);
  });

  it('falls back to order total when the payment amount is zero', () => {
    expect(
      getAccountingManualPaymentAmount({
        amount: 0,
        order: { total: 9 },
      })
    ).toBe(900);
  });

  it('normalizes legacy accounting movement amounts created before the cents rollout', () => {
    expect(
      normalizeAccountingMovementAmount({
        amount: 18,
        createdAt: '2026-05-08T12:00:00.000Z',
      })
    ).toBe(1800);
  });

  it('keeps newer accounting movement amounts unchanged', () => {
    expect(
      normalizeAccountingMovementAmount({
        amount: 1800,
        createdAt: '2026-05-08T18:00:00.000Z',
      })
    ).toBe(1800);
  });

  it('falls back to updatedAt or createdAt for manual payment dates', () => {
    expect(
      getAccountingPaymentDate({
        paidAt: null,
        updatedAt: '2026-05-03T12:00:00.000Z',
        createdAt: '2026-05-01T12:00:00.000Z',
      })?.toISOString()
    ).toBe('2026-05-03T12:00:00.000Z');

    expect(
      getAccountingPaymentDate({
        paidAt: null,
        updatedAt: null,
        createdAt: '2026-05-01T12:00:00.000Z',
      })?.toISOString()
    ).toBe('2026-05-01T12:00:00.000Z');
  });

  it('counts the responsible user plus additional family members', () => {
    expect(
      getFamilyGroupMemberCount({
        responsibleUserId: 'user-1',
        members: [{}, {}],
      })
    ).toBe(3);
  });

  it('counts only additional members when there is no responsible user linked', () => {
    expect(
      getFamilyGroupMemberCount({
        responsibleUserId: null,
        members: [{}],
      })
    ).toBe(1);
  });
});
