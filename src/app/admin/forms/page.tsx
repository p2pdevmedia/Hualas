import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Box, Heading, Flex, Container } from '@radix-ui/themes';
import { Button } from '@/components/ui/button';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
    <Container>
      <div className="py-8">
        <Flex justify="between" align="center" mb="6" gap="4" className="flex-col sm:flex-row">
          <Heading size="8">Formularios</Heading>
          <Link href="/admin/forms/new">
            <Button>Nuevo formulario</Button>
          </Link>
        </Flex>
        <FormList
          forms={forms.map((f) => ({
            id: f.id,
            title: f.title,
            responseCount: f._count.responses,
          }))}
        />
      </div>
    </Container>
  );
}
