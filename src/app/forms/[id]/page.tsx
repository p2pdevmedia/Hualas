import { prisma } from '@/lib/prisma';
import FormDisplay from './form';

export default async function FormPage({ params }: { params: { id: string } }) {
  const form = await prisma.form.findUnique({
    where: { id: params.id },
    include: { fields: { orderBy: { order: 'asc' } } },
  });
  if (!form) {
    return <div className="p-4">Form not found</div>;
  }
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{form.title}</h1>
      <FormDisplay form={form} />
    </div>
  );
}
