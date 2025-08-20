import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import NewForm from './new-form';

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
      <h1 className="text-2xl font-bold mb-4">Forms</h1>
      <NewForm />
      <ul className="mt-4 space-y-2">
        {forms.map((f) => (
          <li key={f.id}>{f.title}</li>
        ))}
      </ul>
    </div>
  );
}
