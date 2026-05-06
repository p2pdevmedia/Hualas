import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ProfileForm from './form';
import ProfilePhotoUpload from './profile-photo-upload';
import { checkUserProfile } from '@/lib/participant-profile-check';

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: { returnTo?: string; onboarding?: string };
}) {
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
      allergies: true,
      regularMedication: true,
      relevantDiseases: true,
      previousInjuries: true,
      physicalRestrictions: true,
      bloodGroup: true,
      primaryDoctor: true,
      doctorPhone: true,
      doctorCertificate: true,
    },
  });
  if (!user) {
    redirect('/');
  }
  const returnTo =
    typeof searchParams?.returnTo === 'string' &&
    searchParams.returnTo.startsWith('/')
      ? searchParams.returnTo
      : null;
  const profileCheck = checkUserProfile(user);
  const showOnboarding =
    searchParams?.onboarding === '1' || !profileCheck.valid;

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
      {showOnboarding && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-primary">
          <p className="font-semibold">Completá tus datos obligatorios</p>
          <p className="mt-1 text-primary/80">
            Para terminar el alta, cargá nombre, apellido, DNI, fecha de
            nacimiento, domicilio y teléfono.
          </p>
        </div>
      )}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <ProfileForm
          user={{
            ...user,
            birthDate: user.birthDate
              ? user.birthDate.toISOString().split('T')[0]
              : null,
          }}
          returnTo={returnTo}
        />
      </div>
    </div>
  );
}
