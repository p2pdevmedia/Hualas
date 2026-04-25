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
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/');
  }
  const form = await prisma.form.findUnique({
    where: { id: params.id },
    include: { fields: { orderBy: { order: 'asc' } } },
  });
  if (!form) {
    return <div className="max-w-2xl mx-auto px-4 py-8"><p className="text-muted-foreground">Formulario no encontrado.</p></div>;
  }
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Editar formulario</h1>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <EditForm form={form} />
      </div>
    </div>
  );
}
