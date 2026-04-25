import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import EditChildForm from './form';

export default async function EditChildPage({
  params,
}: {
  params: { id: string; childId: string };
}) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    redirect('/');
  }

  const child = await prisma.child.findFirst({
    where: {
      id: params.childId,
      userId: params.id,
    },
    select: {
      id: true,
      name: true,
      lastName: true,
      documentType: true,
      documentNumber: true,
      birthDate: true,
      address: true,
      gender: true,
      nationality: true,
      maritalStatus: true,
      allergies: true,
      regularMedication: true,
      relevantDiseases: true,
      previousInjuries: true,
      physicalRestrictions: true,
      bloodGroup: true,
      primaryDoctor: true,
      doctorPhone: true,
      observations: true,
    },
  });

  if (!child) {
    redirect(`/admin/users/${params.id}/view`);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Editar hijo</h1>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <EditChildForm
          userId={params.id}
          child={{
            ...child,
            birthDate: child.birthDate
              ? child.birthDate.toISOString().split('T')[0]
              : null,
          }}
        />
      </div>
    </div>
  );
}
