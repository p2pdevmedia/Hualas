import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Heading, Text, Box, Container } from '@radix-ui/themes';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import EditForm from './edit-form';

export default async function EditFormPage({
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
    include: { fields: { orderBy: { order: 'asc' } } },
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
  return (
    <Container>
      <div className="py-8 space-y-4">
        <Heading size="8">Editar formulario</Heading>
        <Box className="rounded-xl border bg-card p-6 shadow-sm">
          <EditForm form={form} />
        </Box>
      </div>
    </Container>
  );
}
