import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Heading, Container } from '@radix-ui/themes';
import { authOptions } from '@/lib/auth';
import AdminChildrenManager from './children';

export default async function ChildEnrollmentPage({
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
  return (
    <Container>
      <div className="py-8 space-y-4">
        <Heading size="8">Inscripción de hijos</Heading>
        <AdminChildrenManager userId={params.id} />
      </div>
    </Container>
  );
}
