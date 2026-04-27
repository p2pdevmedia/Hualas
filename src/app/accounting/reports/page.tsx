import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isAccountingRole } from '@/lib/accounting';
import ReportsClient from './reports-client';

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole(session?.user?.role)) {
    redirect('/');
  }

  return <ReportsClient />;
}
