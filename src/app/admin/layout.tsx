import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { gateAdmin } from '@/lib/role-guards';
import { hasAdminCapability, hasCapability } from '@/lib/roles';

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Counter-only users have no admin capability; send them to their natural
  // landing page instead of the generic redirect.
  if (
    session?.user &&
    !hasAdminCapability(session) &&
    hasCapability(session, 'COUNTER')
  ) {
    redirect('/accounting');
  }

  const block = gateAdmin(session);
  if (block) {
    return <div className="mx-auto max-w-6xl px-4 py-10">{block}</div>;
  }
  return <>{children}</>;
}
