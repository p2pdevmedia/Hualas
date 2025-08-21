import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import EditForm from './edit-form';

export default async function EditFormPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/');
  }
  const form = await prisma.form.findUnique({
    where: { id: params.id },
    include: { fields: { orderBy: { order: 'asc' } } },
  });
  if (!form) {
    return <div className="p-4">Form not found</div>;
  }
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Form</h1>
      <EditForm form={form} />
    </div>
  );
}
