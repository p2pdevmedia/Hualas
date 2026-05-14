import {
  buildManualPaymentHistoryActionHref,
  manualPaymentHistoryStatusLabel,
} from '../accounting-manual-payment-history';

describe('accounting manual payment history helpers', () => {
  it('labels every manual payment status for the accounting history', () => {
    expect(manualPaymentHistoryStatusLabel('PENDING')).toBe('Pendiente');
    expect(manualPaymentHistoryStatusLabel('APPROVED')).toBe('Aprobado');
    expect(manualPaymentHistoryStatusLabel('REJECTED')).toBe('Rechazado');
    expect(manualPaymentHistoryStatusLabel('CANCELLED')).toBe('Cancelado');
  });

  it('links a manual payment history row to the matching review status', () => {
    expect(
      buildManualPaymentHistoryActionHref({
        status: 'APPROVED',
        search: 'Ivan Muller',
      })
    ).toBe('/accounting/manual-payments?status=APPROVED&q=Ivan+Muller');

    expect(
      buildManualPaymentHistoryActionHref({
        status: 'PENDING',
        search: 'mullerivan@gmail.com',
      })
    ).toBe(
      '/accounting/manual-payments?status=PENDING&q=mullerivan%40gmail.com'
    );
  });
});
