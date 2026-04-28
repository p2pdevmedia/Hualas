import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Heading, Box, Container } from '@radix-ui/themes';
import { authOptions } from '@/lib/auth';
import NewForm from '../new-form';

export default async function NewFormPage() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    redirect('/');
  }
  return (
    <Container>
      <div className="py-8 space-y-4">
        <Heading size="8">Nuevo formulario</Heading>
        <Box className="rounded-xl border bg-card p-6 shadow-sm">
          <NewForm />
        </Box>
      </div>
    </Container>
  );
}
