import type { Notification, NotificationType, Role } from '@prisma/client';

export type NotificationVisibilityInput = Pick<Notification, 'type' | 'url'>;

const ADMIN_ROLES: Role[] = ['ADMIN', 'SUPER_ADMIN'];
const ACCOUNTING_ROLES: Role[] = ['COUNTER', 'ADMIN', 'SUPER_ADMIN'];
const PROFESSOR_ROLES: Role[] = ['PROFESSOR'];
const GROUP_MANAGER_ROLES: Role[] = ['ADMIN', 'PROFESSOR', 'SUPER_ADMIN'];

const ADMIN_ONLY_TYPES = new Set<NotificationType>(['ACTIVITY_CAPACITY_FULL']);

const ACCOUNTING_TYPES = new Set<NotificationType>([
  'PAYMENT_MANUAL_CREATED',
  'PROFESSOR_INVOICE_CREATED',
]);

const PROFESSOR_ONLY_TYPES = new Set<NotificationType>([
  'PROFESSOR_ACTIVITY_ASSIGNED',
  'PROFESSOR_GROUP_ASSIGNED',
]);

function startsWithPath(url: string | null | undefined, path: string): boolean {
  return url === path || url?.startsWith(`${path}/`) === true;
}

export function getNotificationRequiredActiveRoles(
  notification: NotificationVisibilityInput
): Role[] | null {
  if (PROFESSOR_ONLY_TYPES.has(notification.type)) return PROFESSOR_ROLES;
  if (ACCOUNTING_TYPES.has(notification.type)) return ACCOUNTING_ROLES;
  if (ADMIN_ONLY_TYPES.has(notification.type)) return ADMIN_ROLES;

  const url = notification.url;
  if (startsWithPath(url, '/accounting')) return ACCOUNTING_ROLES;
  if (startsWithPath(url, '/admin')) return ADMIN_ROLES;
  if (startsWithPath(url, '/my-payments')) return PROFESSOR_ROLES;

  if (url && /^\/activities\/[^/]+\/groups\/[^/]+(?:$|[/?#])/.test(url)) {
    return GROUP_MANAGER_ROLES;
  }

  return null;
}

export function isNotificationVisibleForActiveRole(
  notification: NotificationVisibilityInput,
  activeRole: Role | null | undefined
): boolean {
  const requiredRoles = getNotificationRequiredActiveRoles(notification);
  if (!requiredRoles) return true;
  if (!activeRole) return false;
  return requiredRoles.includes(activeRole);
}

export function filterNotificationsForActiveRole<
  T extends NotificationVisibilityInput,
>(notifications: T[], activeRole: Role | null | undefined): T[] {
  return notifications.filter((notification) =>
    isNotificationVisibleForActiveRole(notification, activeRole)
  );
}
