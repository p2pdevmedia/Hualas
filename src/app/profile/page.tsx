import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ProfileForm from './form';
import ChildrenManager from './children';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }
  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: {
      name: true,
      lastName: true,
      dni: true,
      birthDate: true,
      gender: true,
      address: true,
      phone: true,
      nationality: true,
      maritalStatus: true,
      email: true,
    },
  });
  if (!user) {
    redirect('/');
  }
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Mi perfil</h1>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <ProfileForm
          user={{
            ...user,
            birthDate: user.birthDate
              ? user.birthDate.toISOString().split('T')[0]
              : null,
          }}
        />
      </div>
      <ChildrenManager userAddress={user.address ?? ''} />
    </div>
  );
}
