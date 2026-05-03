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
  // Auth gating happens in the parent /admin layout.
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
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">Formulario no encontrado.</p>
      </div>
    );
  }
  const fieldMap = Object.fromEntries(form.fields.map((f) => [f.id, f.label]));
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">
        Respuestas: {form.title}
      </h1>
      {form.responses.length === 0 && (
        <p className="text-sm text-muted-foreground">Sin respuestas todavía.</p>
      )}
      <ul className="space-y-3">
        {form.responses.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border bg-card shadow-sm overflow-hidden"
          >
            <details>
              <summary className="px-4 py-3 cursor-pointer font-medium hover:bg-muted/40 transition-colors">
                {r.user?.name || r.user?.email || 'Anónimo'}
              </summary>
              <ul className="px-4 pb-4 pt-2 space-y-1 border-t border-border">
                {Object.entries(r.data as Record<string, unknown>).map(
                  ([fieldId, value]) => (
                    <li key={fieldId} className="text-sm">
                      <span className="font-medium">
                        {fieldMap[fieldId] || fieldId}:
                      </span>{' '}
                      <span className="text-muted-foreground">
                        {String(value)}
                      </span>
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
