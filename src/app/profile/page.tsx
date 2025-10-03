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
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Mi perfil</h1>
        <p className="text-sm text-slate-500">
          Actualizá tus datos personales y gestioná la información de tu grupo
          familiar.
        </p>
      </div>
      <ProfileForm
        user={{
          ...user,
          birthDate: user.birthDate
            ? user.birthDate.toISOString().split('T')[0]
            : null,
        }}
      />
      <ChildrenManager userAddress={user.address ?? ''} />
    </div>
  );
}
