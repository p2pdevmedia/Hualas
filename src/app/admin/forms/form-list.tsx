'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, Flex, Text } from '@radix-ui/themes';
import { useTranslation } from '@/components/language-provider';

interface Form {
  id: string;
  title: string;
  responseCount: number;
}

export default function FormList({ forms }: { forms: Form[] }) {
  const router = useRouter();
  const t = useTranslation().actions;

  const handleDelete = async (id: string) => {
    await fetch(`/api/forms/${id}`, { method: 'DELETE' });
    router.refresh();
  };

  const linkClass =
    'text-sm text-primary hover:text-primary/80 hover:underline underline-offset-4';

  if (forms.length === 0) {
    return (
      <Text size="2" color="gray">
        No hay formularios creados.
      </Text>
    );
  }

  return (
    <Box className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              Título
            </th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              Respuestas
            </th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {forms.map((f) => (
            <tr key={f.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-medium">{f.title}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {f.responseCount}
              </td>
              <td className="px-4 py-3">
                <Flex align="center" gap="3">
                  <Link href={`/admin/forms/${f.id}`} className={linkClass}>
                    {t.view}
                  </Link>
                  <Link
                    href={`/admin/forms/${f.id}/edit`}
                    className={linkClass}
                  >
                    {t.edit}
                  </Link>
                  <Link
                    href={`/forms/${f.id}`}
                    className={linkClass}
                    target="_blank"
                  >
                    Público
                  </Link>
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="text-sm text-destructive hover:text-destructive/80"
                  >
                    {t.delete}
                  </button>
                </Flex>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
}
