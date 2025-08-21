import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import NewForm from '../new-form';

export default async function NewFormPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/');
  }
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">New Form</h1>
      <NewForm />
    </div>
  );
}
