import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ProfileForm from './form';
import ProfilePhotoUpload from './profile-photo-upload';
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
      profilePhoto: true,
      updatedAt: true,
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
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-[220px,1fr] md:items-center">
          <ProfilePhotoUpload
            hasPhoto={Boolean(user.profilePhoto)}
            photoVersion={user.updatedAt.getTime()}
            name={user.name}
            lastName={user.lastName}
          />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Mi perfil</h1>
            <p className="text-sm text-muted-foreground">
              Actualizá tus datos y guardá una foto de perfil tomada con la
              cámara o subida desde tu dispositivo.
            </p>
          </div>
        </div>
      </div>
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
