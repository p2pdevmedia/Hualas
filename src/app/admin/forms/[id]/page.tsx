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
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/');
  }
  const form = await prisma.form.findUnique({
    where: { id: params.id },
    select: {
      title: true,
      fields: { select: { id: true, label: true } },
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
  const fieldMap = Object.fromEntries(form.fields.map((f) => [f.id, f.label]));
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{form.title} Responses</h1>
      <ul className="space-y-2">
        {form.responses.map((r) => (
          <li key={r.id} className="border p-2">
            <details>
              <summary>{r.user?.name || r.user?.email || 'Anonymous'}</summary>
              <ul className="mt-2">
                {Object.entries(r.data as Record<string, unknown>).map(
                  ([fieldId, value]) => (
                    <li key={fieldId}>
                      <strong>{fieldMap[fieldId] || fieldId}:</strong>{' '}
                      {String(value)}
                    </li>
                  )
                )}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
