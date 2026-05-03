import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';
import RoleSwitchPrompt from '@/components/role-switch-prompt';
import {
  getActiveRole,
  hasAccountingCapability,
  hasAdminCapability,
  hasAnyCapability,
  hasProfessorCapability,
  hasSuperAdminCapability,
} from './roles';
import type { AppRole } from './roles';

/**
 * If the user has the capability but is in the wrong active profile, returns
 * a `<RoleSwitchPrompt />` JSX node the caller must render. Otherwise:
 *  - returns null if access is allowed,
 *  - redirects (no return) if the user lacks the capability or session.
 */
export function gateActiveRole(
  session: Session | null | undefined,
  required: AppRole | AppRole[],
  options?: { redirectTo?: string }
) {
  const redirectTo = options?.redirectTo ?? '/';
  if (!session?.user) {
    redirect('/login');
  }
  const requiredList = Array.isArray(required) ? required : [required];
  const active = getActiveRole(session);
  if (active && requiredList.includes(active)) return null;

  if (hasAnyCapability(session, requiredList)) {
    const target = requiredList[0];
    return <RoleSwitchPrompt requiredRole={target} />;
  }
  redirect(redirectTo);
}

/** Accounting view requires COUNTER or ADMIN as activeRole. */
export function gateAccounting(session: Session | null | undefined) {
  if (!session?.user) redirect('/login');
  const active = getActiveRole(session);
  if (active === 'COUNTER' || active === 'ADMIN') return null;
  if (hasAccountingCapability(session)) {
    return <RoleSwitchPrompt requiredRole="COUNTER" />;
  }
  redirect('/');
}

/** Admin view requires ADMIN as activeRole; SUPER_ADMIN capability boosts it. */
export function gateAdmin(session: Session | null | undefined) {
  if (!session?.user) redirect('/login');
  if (getActiveRole(session) === 'ADMIN') return null;
  if (hasAdminCapability(session)) {
    return <RoleSwitchPrompt requiredRole="ADMIN" />;
  }
  redirect('/');
}

/** SUPER_ADMIN-only sections (audit log, notifications, site settings). */
export function gateSuperAdmin(session: Session | null | undefined) {
  if (!session?.user) redirect('/login');
  if (getActiveRole(session) === 'ADMIN' && hasSuperAdminCapability(session)) {
    return null;
  }
  if (hasSuperAdminCapability(session)) {
    return <RoleSwitchPrompt requiredRole="ADMIN" />;
  }
  redirect('/');
}

/** Professor view requires PROFESSOR as activeRole. */
export function gateProfessor(session: Session | null | undefined) {
  if (!session?.user) redirect('/login');
  if (getActiveRole(session) === 'PROFESSOR') return null;
  if (hasProfessorCapability(session)) {
    return <RoleSwitchPrompt requiredRole="PROFESSOR" />;
  }
  redirect('/');
}
