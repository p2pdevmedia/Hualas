import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import EditUserForm from './form';

export default async function EditUserPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  // Auth gating happens in the parent /admin layout.
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      role: true,
      dni: true,
      birthDate: true,
      gender: true,
      address: true,
      phone: true,
      nationality: true,
      maritalStatus: true,
      isActive: true,
      socialFeeActive: true,
      observations: true,
      allergies: true,
      regularMedication: true,
      relevantDiseases: true,
      previousInjuries: true,
      physicalRestrictions: true,
      bloodGroup: true,
      primaryDoctor: true,
      doctorPhone: true,
      roleAssignments: { select: { role: true } },
    },
  });
  if (!user) {
    redirect('/admin/users');
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Editar usuario</h1>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <EditUserForm
          user={{
            ...user,
            birthDate: user.birthDate
              ? user.birthDate.toISOString().split('T')[0]
              : null,
            roles: user.roleAssignments.map((a) => a.role),
          }}
        />
      </div>
    </div>
  );
}
