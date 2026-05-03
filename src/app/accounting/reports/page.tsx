import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isAccountingRole } from '@/lib/accounting';
import ReportsClient from './reports-client';

export default async function ReportsPage() {
  // Auth gating happens in the parent /accounting layout.
  await getServerSession(authOptions);

  return <ReportsClient />;
}
