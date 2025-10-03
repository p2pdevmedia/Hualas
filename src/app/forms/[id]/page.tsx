import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import FormDisplay from './form';

export default async function FormPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    redirect('/');
  }

  const form = await prisma.form.findUnique({
    where: { id: params.id },
    include: { fields: { orderBy: { order: 'asc' } } },
  });
  if (!form) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300/70 bg-white/60 p-10 text-center text-slate-500 backdrop-blur">
        Formulario no disponible
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">
          {form.title}
        </h1>
        {form.description && (
          <p className="text-sm text-slate-500">{form.description}</p>
        )}
      </div>
      <FormDisplay form={form} />
    </div>
  );
}
