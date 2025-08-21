import { PaymentType } from '@prisma/client';

export const paymentTypeLabels: Record<PaymentType, string> = {
  ONE_TIME: 'Pago único',
  MONTHLY: 'Mensual',
  WEEKLY: 'Semanal',
  DAILY: 'Diario',
};

export const paymentTypeOptions = Object.entries(paymentTypeLabels).map(
  ([value, label]) => ({ value: value as PaymentType, label })
);
