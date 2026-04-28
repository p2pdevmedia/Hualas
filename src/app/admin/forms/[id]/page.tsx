import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Text, Container, Heading, Box } from '@radix-ui/themes';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function FormResponsesPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
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
    return (
      <Container>
        <div className="py-8">
          <Text color="gray">Formulario no encontrado.</Text>
        </div>
      </Container>
    );
  }
  const fieldMap = Object.fromEntries(form.fields.map((f) => [f.id, f.label]));
  return (
    <Container>
      <div className="py-8 space-y-4">
        <Heading size="8">Respuestas: {form.title}</Heading>
        {form.responses.length === 0 && (
          <Text size="2" color="gray">
            Sin respuestas todavía.
          </Text>
        )}
        <Box className="space-y-3">
          {form.responses.map((r) => (
            <Box
              key={r.id}
              className="rounded-xl border bg-card shadow-sm overflow-hidden"
            >
              <details>
                <summary className="px-4 py-3 cursor-pointer font-medium hover:bg-muted/40 transition-colors">
                  {r.user?.name || r.user?.email || 'Anónimo'}
                </summary>
                <Box className="px-4 pb-4 pt-2 space-y-1 border-t border-border">
                  {Object.entries(r.data as Record<string, unknown>).map(
                    ([fieldId, value]) => (
                      <Box key={fieldId} className="text-sm">
                        <Text weight="medium" className="inline">
                          {fieldMap[fieldId] || fieldId}:
                        </Text>{' '}
                        <Text color="gray" className="inline">
                          {String(value)}
                        </Text>
                      </Box>
                    )
                  )}
                </Box>
              </details>
            </Box>
          ))}
        </Box>
      </div>
    </Container>
  );
}
