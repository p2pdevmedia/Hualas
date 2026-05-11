import { buildPaymentDetailLines } from '../profile-payment-details';

describe('profile payment details', () => {
  it('builds activity, social fee, and discount lines with participant names', () => {
    const lines = buildPaymentDetailLines({
      orderItems: [
        {
          description: 'Escalada juvenil',
          quantity: 1,
          unitPrice: 150000,
          total: 150000,
          periodMonth: 5,
          periodYear: 2026,
          billableConcept: { code: 'ACTIVITY_FEE' },
          activity: { name: 'Escalada juvenil' },
        },
        {
          description: 'Cuota social (2 participantes)',
          quantity: 2,
          unitPrice: 25000,
          total: 50000,
          periodMonth: 5,
          periodYear: 2026,
          billableConcept: { code: 'SOCIAL_FEE' },
          activity: null,
        },
        {
          description: 'Descuento familiar',
          quantity: 1,
          unitPrice: -15000,
          total: -15000,
          periodMonth: 5,
          periodYear: 2026,
          billableConcept: { code: 'DISCOUNT' },
          activity: null,
        },
      ],
      rawData: {
        socialFeeAmount: 25000,
        socialFeeParticipants: [
          { userId: 'user_1', childId: null },
          { userId: 'user_1', childId: 'child_1' },
        ],
        validatedItems: [
          {
            activityId: 'activity_1',
            target: 'child_1',
            targetLabel: 'Luna Pérez',
          },
        ],
      },
      selfName: 'Ana Pérez',
      childNameById: new Map([['child_1', 'Luna Pérez']]),
    });

    expect(lines).toEqual([
      {
        id: 'activity-0',
        concept: 'Actividad',
        description: 'Escalada juvenil',
        participantName: 'Luna Pérez',
        amount: 150000,
        periodLabel: 'Mayo 2026',
      },
      {
        id: 'social-fee-user_1-self',
        concept: 'Cuota social',
        description: 'Cuota social',
        participantName: 'Ana Pérez',
        amount: 25000,
        periodLabel: 'Mayo 2026',
      },
      {
        id: 'social-fee-user_1-child_1',
        concept: 'Cuota social',
        description: 'Cuota social',
        participantName: 'Luna Pérez',
        amount: 25000,
        periodLabel: 'Mayo 2026',
      },
      {
        id: 'discount-2',
        concept: 'Descuento',
        description: 'Descuento familiar',
        participantName: 'Grupo familiar',
        amount: -15000,
        periodLabel: 'Mayo 2026',
      },
    ]);
  });
});
