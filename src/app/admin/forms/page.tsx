import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import FormList from './form-list';

export default async function FormsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/');
  }
  const forms = await prisma.form.findMany({
    select: { id: true, title: true },
    orderBy: { createdAt: 'desc' },
  });
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Forms</h1>
        <Link
          href="/admin/forms/new"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          New Form
        </Link>
      </div>
      <FormList forms={forms} />
    </div>
  );
}
