import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import AdminChildrenManager from './children';

export default async function ChildEnrollmentPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    redirect('/');
  }
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Child Enrollment</h1>
      <AdminChildrenManager userId={params.id} />
    </div>
  );
}
