import type { Session } from 'next-auth';
import { isAccountingRole } from '@/lib/accounting';

export function hasAccountingApiAccess(session: Session | null | undefined) {
  if (!session?.user) return false;

  const user = session.user as Session['user'] & {
    role?: string | null;
    activeRole?: string | null;
    roles?: string[] | null;
  };

  return (
    isAccountingRole(user.role) ||
    isAccountingRole(user.activeRole) ||
    Boolean(user.roles?.some((role) => isAccountingRole(role)))
  );
}
