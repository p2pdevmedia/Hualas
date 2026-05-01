import {
  getAccountingManualPaymentAmount,
  getAccountingPaymentDate,
} from '../accounting';

describe('accounting helpers', () => {
  it('normalizes manual payments from pesos to accounting cents', () => {
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
});
