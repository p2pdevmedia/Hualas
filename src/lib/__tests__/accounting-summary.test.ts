import {
  buildAccountingCategoryTotals,
  buildAccountingReportEntries,
  summarizeAccounting,
} from '../accounting-summary';
import { getAccountingPaymentDate } from '../accounting';

describe('accounting summary helpers', () => {
  it('counts manual payments and Mercado Pago as income and expenses only from movements', () => {
    const summary = summarizeAccounting({
      movements: [
        {
          id: 'm-1',
          date: '2026-05-01T12:00:00.000Z',
          amount: 1000,
          type: 'INCOME',
          category: 'Cuotas',
          description: 'Cuota mensual',
        },
        {
          id: 'm-2',
          date: '2026-05-02T12:00:00.000Z',
          amount: 250,
          type: 'EXPENSE',
          category: 'Salarios',
          description: 'Pago profesor',
        },
      ],
      manualPayments: [
        {
          id: 'p-1',
          paidAt: '2026-05-03T12:00:00.000Z',
          amount: 400,
          customerName: 'Socio Manual',
          activities: ['Actividad A'],
          receiptUrl: 'https://example.com/manual.pdf',
        },
      ],
      mpPayments: [
        {
          id: 'mp-1',
          receiptDate: '2026-05-04T12:00:00.000Z',
          amount: 600,
          participantName: 'Socio MP',
          activityName: 'Actividad B',
          receipt: 'MP-123',
        },
      ],
    });

    expect(summary).toEqual({
      movementIncome: 1000,
      movementExpense: 250,
      manualIncome: 400,
      mpIncome: 600,
      totalIncome: 2000,
      totalExpense: 250,
      netBalance: 1750,
    });
  });

  it('builds a unified export list sorted by most recent first', () => {
    const entries = buildAccountingReportEntries({
      movements: [
        {
          id: 'm-1',
          date: '2026-05-01T12:00:00.000Z',
          amount: 1000,
          type: 'INCOME',
          category: 'Cuotas',
          description: 'Cuota mensual',
          receiptNumber: 'R-1',
        },
      ],
      manualPayments: [
        {
          id: 'p-1',
          paidAt: '2026-05-03T12:00:00.000Z',
          amount: 400,
          customerName: 'Socio Manual',
          activities: ['Actividad A'],
          receiptUrl: 'https://example.com/manual.pdf',
        },
      ],
      mpPayments: [
        {
          id: 'mp-1',
          receiptDate: '2026-05-04T12:00:00.000Z',
          amount: 600,
          participantName: 'Socio MP',
          activityName: 'Actividad B',
          receipt: 'MP-123',
        },
      ],
    });

    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({
      id: 'mp:mp-1',
      source: 'Mercado Pago',
      type: 'INCOME',
      category: 'Mercado Pago',
      amount: 600,
      reference: 'MP-123',
    });
    expect(entries[1]).toMatchObject({
      id: 'manual:p-1',
      source: 'Pago manual',
      type: 'INCOME',
      category: 'Pagos manuales',
      amount: 400,
    });
    expect(entries[2]).toMatchObject({
      id: 'movement:m-1',
      source: 'Movimiento manual',
      type: 'INCOME',
      category: 'Cuotas',
      amount: 1000,
      reference: 'R-1',
    });
  });

  it('builds category totals including manual payments and Mercado Pago', () => {
    const totals = buildAccountingCategoryTotals([
      {
        category: 'Cuotas',
        type: 'INCOME',
        amount: 1000,
      },
      {
        category: 'Pagos manuales',
        type: 'INCOME',
        amount: 400,
      },
      {
        category: 'Mercado Pago',
        type: 'INCOME',
        amount: 600,
      },
      {
        category: 'Salarios',
        type: 'EXPENSE',
        amount: 250,
      },
    ]);

    expect(totals).toEqual({
      Cuotas: { income: 1000, expense: 0 },
      'Pagos manuales': { income: 400, expense: 0 },
      'Mercado Pago': { income: 600, expense: 0 },
      Salarios: { income: 0, expense: 250 },
    });
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
