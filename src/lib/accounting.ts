export const ACCOUNTING_ROLES = ['COUNTER', 'ADMIN', 'SUPER_ADMIN'] as const;
export type AccountingRole = (typeof ACCOUNTING_ROLES)[number];

export function isAccountingRole(
  role: string | undefined | null
): role is AccountingRole {
  return ACCOUNTING_ROLES.includes(role as AccountingRole);
}

export function isCounterRole(
  role: string | undefined | null
): role is 'COUNTER' {
  return role === 'COUNTER';
}

export type MovementType = 'INCOME' | 'EXPENSE';

export const MOVEMENT_CATEGORIES = [
  'Cuotas',
  'Actividades',
  'Servicios',
  'Equipamiento',
  'Subsidios',
  'Salarios',
  'Eventos',
  'Otros',
] as const;

export type MovementCategory = (typeof MOVEMENT_CATEGORIES)[number];

export function formatAmount(centavos: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(centavos / 100);
}

export function formatAccountingDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
  }).format(date);
}

export function getAccountingManualPaymentAmount(
  payment:
    | {
        amount: number;
        order?: {
          total?: number | null;
        } | null;
      }
    | null
    | undefined
): number {
  if (!payment) return 0;

  const rawAmount =
    payment.amount !== 0 ? payment.amount : (payment.order?.total ?? 0);

  // Legacy manual payments may have been stored in pesos instead of cents.
  // If amount matches order total exactly, treat it as pesos and normalize.
  if (payment.order?.total != null && rawAmount === payment.order.total) {
    return rawAmount * 100;
  }

  return rawAmount;
}

export function formatPersonName(
  person:
    | {
        name?: string | null;
        lastName?: string | null;
      }
    | null
    | undefined
): string {
  if (!person) return 'Sin nombre';
  return `${person.name ?? ''} ${person.lastName ?? ''}`.trim() || 'Sin nombre';
}

export function movementTypeLabel(type: MovementType): string {
  return type === 'INCOME' ? 'Ingreso' : 'Egreso';
}

export function movementTypeClass(type: MovementType): string {
  return type === 'INCOME'
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : 'bg-rose-100 text-rose-700 border-rose-200';
}

export function getAccountingPaymentDate(
  payment:
    | {
        paidAt?: Date | string | null;
        updatedAt?: Date | string | null;
        createdAt?: Date | string | null;
      }
    | null
    | undefined
): Date | null {
  const value = payment?.paidAt ?? payment?.updatedAt ?? payment?.createdAt;
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
