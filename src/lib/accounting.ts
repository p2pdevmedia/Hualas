export const ACCOUNTING_ROLES = ['COUNTER', 'ADMIN', 'SUPER_ADMIN'] as const;
export type AccountingRole = (typeof ACCOUNTING_ROLES)[number];

export function isAccountingRole(role: string | undefined | null): role is AccountingRole {
  return ACCOUNTING_ROLES.includes(role as AccountingRole);
}

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
