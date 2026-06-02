import { buildProfessorPaymentDashboardEntries } from '../accounting-dashboard';

describe('accounting dashboard helpers', () => {
  it('shows transferred professor invoices as expense movements', () => {
    const entries = buildProfessorPaymentDashboardEntries([
      {
        id: 'payment_1',
        paidAt: '2026-06-01T12:00:00.000Z',
        periodMonth: 6,
        periodYear: 2026,
        amount: 125000,
        professorProfile: {
          user: {
            id: 'professor_1',
            name: 'Juan',
            lastName: 'Ramos',
          },
        },
        invoice: {
          id: 'invoice_1',
          originalName: 'factura-junio.pdf',
        },
        activity: {
          name: 'Escalada adultos',
        },
      },
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: 'payment_1',
      date: new Date('2026-06-01T12:00:00.000Z'),
      origin: 'PROFESSOR_PAYMENT',
      type: 'EXPENSE',
      category: 'Honorarios profesores',
      description: 'Juan Ramos · Escalada adultos · 06/2026',
      amount: 125000,
      receiptLabel: 'factura-junio.pdf',
      receiptHref: '/api/professor-invoices/invoice_1/file',
      actionLabel: 'Ver',
      actionHref: '/accounting/professors/professor_1',
      personHref: '/accounting/professors/professor_1',
    });
  });
});
