import type { Session } from 'next-auth';
import type { Role } from '@prisma/client';

export type AppRole = Role;

export const ELEVATED_ROLES: AppRole[] = [
  'PROFESSOR',
  'COUNTER',
  'ADMIN',
  'SUPER_ADMIN',
];

export const SWITCHABLE_PROFILES: AppRole[] = [
  'MEMBER',
  'PROFESSOR',
  'COUNTER',
  'ADMIN',
];

type SessionUser = NonNullable<Session['user']>;

function user(session: Session | null | undefined): SessionUser | null {
  return session?.user ?? null;
}

export function getRoles(session: Session | null | undefined): AppRole[] {
  return user(session)?.roles ?? [];
}

export function getActiveRole(
  session: Session | null | undefined
): AppRole | null {
  return user(session)?.activeRole ?? null;
}

/** Does the user *have* this role (capability check)? */
export function hasCapability(
  session: Session | null | undefined,
  role: AppRole
): boolean {
  return getRoles(session).includes(role);
}

/** Has any of the given roles. */
export function hasAnyCapability(
  session: Session | null | undefined,
  roles: AppRole[]
): boolean {
  const owned = new Set(getRoles(session));
  return roles.some((r) => owned.has(r));
}

/** SUPER_ADMIN is treated as a "boost" of ADMIN. */
export function hasAdminCapability(session: Session | null | undefined) {
  return hasAnyCapability(session, ['ADMIN', 'SUPER_ADMIN']);
}

export function hasSuperAdminCapability(session: Session | null | undefined) {
  return hasCapability(session, 'SUPER_ADMIN');
}

export function hasAccountingCapability(session: Session | null | undefined) {
  return hasAnyCapability(session, ['COUNTER', 'ADMIN', 'SUPER_ADMIN']);
}

export function hasProfessorCapability(session: Session | null | undefined) {
  return hasCapability(session, 'PROFESSOR');
}

/** Is the user *currently viewing* the app as this role? */
export function isActive(
  session: Session | null | undefined,
  role: AppRole
): boolean {
  return getActiveRole(session) === role;
}

/** ADMIN view; SUPER_ADMIN capability boosts the ADMIN view in-place. */
export function isActiveAdmin(session: Session | null | undefined) {
  return isActive(session, 'ADMIN');
}

export function isActiveAccounting(session: Session | null | undefined) {
  const r = getActiveRole(session);
  return r === 'COUNTER' || r === 'ADMIN';
}

export function isActiveCounter(session: Session | null | undefined) {
  return isActive(session, 'COUNTER');
}

export function isActiveProfessor(session: Session | null | undefined) {
  return isActive(session, 'PROFESSOR');
}

export function isActiveMember(session: Session | null | undefined) {
  return isActive(session, 'MEMBER');
}

/** UI helper: whether the SUPER_ADMIN extras should be visible right now. */
export function showsSuperAdminExtras(session: Session | null | undefined) {
  return hasSuperAdminCapability(session) && isActiveAdmin(session);
}

/**
 * Page guard result:
 *  - 'ok'             : activeRole satisfies the requirement.
 *  - 'switch'         : user has the capability but is in a different profile;
 *                       page should render <RoleSwitchPrompt /> with the target.
 *  - 'forbidden'      : user does not have the capability; page should redirect/404.
 *  - 'unauthenticated': no session.
 */
export type GuardResult =
  | { kind: 'ok' }
  | { kind: 'switch'; requiredRole: AppRole }
  | { kind: 'forbidden' }
  | { kind: 'unauthenticated' };

export function guardActiveRole(
  session: Session | null | undefined,
  required: AppRole | AppRole[]
): GuardResult {
  if (!session?.user) return { kind: 'unauthenticated' };
  const requiredList = Array.isArray(required) ? required : [required];
  if (requiredList.includes(getActiveRole(session) ?? 'MEMBER')) {
    return { kind: 'ok' };
  }
  // Pick the first required role the user actually has. If they have several
  // matching capabilities, we surface the first one in the requested list as
  // the suggested switch target.
  const owned = new Set(getRoles(session));
  const targetable = requiredList.find((r) => owned.has(r));
  if (targetable) return { kind: 'switch', requiredRole: targetable };
  return { kind: 'forbidden' };
}

/**
 * API guard helper: returns a NextResponse-shaped object for callers to
 * forward, or null if access is allowed. Keeping it framework-agnostic so the
 * callers stay flexible.
 */
export function apiRoleError(result: GuardResult): {
  status: number;
  body: Record<string, unknown>;
} | null {
  switch (result.kind) {
    case 'ok':
      return null;
    case 'unauthenticated':
      return { status: 401, body: { error: 'unauthenticated' } };
    case 'switch':
      return {
        status: 403,
        body: {
          error: 'role_switch_required',
          requiredRole: result.requiredRole,
        },
      };
    case 'forbidden':
      return { status: 403, body: { error: 'forbidden' } };
  }
}
