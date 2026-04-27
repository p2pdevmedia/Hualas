export const ACCOUNTING_ROLES = ['COUNTER', 'ADMIN', 'SUPER_ADMIN'] as const;
export type AccountingRole = (typeof ACCOUNTING_ROLES)[number];

export function isAccountingRole(
  role: string | undefined | null
): role is AccountingRole {
  return ACCOUNTING_ROLES.includes(role as AccountingRole);
}

export function isCounterRole(role: string | undefined | null): role is 'COUNTER' {
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
