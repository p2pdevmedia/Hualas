import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function FormResponsesPage({
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
    select: {
      title: true,
      responses: {
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!form) {
    return <div className="p-4">Form not found</div>;
  }
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{form.title} Responses</h1>
      <ul className="space-y-2">
        {form.responses.map((r) => (
          <li key={r.id} className="border p-2">
            {r.user?.name || r.user?.email || 'Anonymous'}
          </li>
        ))}
      </ul>
    </div>
  );
}
