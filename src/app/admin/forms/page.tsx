import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import FormList from './form-list';

export default async function FormsPage() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    redirect('/');
  }
  const forms = await prisma.form.findMany({
    select: {
      id: true,
      title: true,
      _count: { select: { responses: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Formularios</h1>
        <Link
          href="/admin/forms/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Nuevo formulario
        </Link>
      </div>
      <FormList
        forms={forms.map((f) => ({
          id: f.id,
          title: f.title,
          responseCount: f._count.responses,
        }))}
      />
    </div>
  );
}
