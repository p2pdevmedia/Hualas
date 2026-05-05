import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import MergeChildrenClient from './merge-client';

export default async function MergeChildrenPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    redirect('/admin/users');
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, lastName: true },
  });

  if (!user) redirect('/admin/users');

  const children = await prisma.child.findMany({
    where: { userId: params.id },
    orderBy: { createdAt: 'asc' },
    include: {
      _count: {
        select: {
          activityParticipants: true,
          socialFeePayments: true,
          pickupNotices: true,
        },
      },
    },
  });

  if (children.length < 2) {
    redirect(`/admin/users/${params.id}/view`);
  }

  const serialized = children.map((c) => ({
    id: c.id,
    name: c.name,
    lastName: c.lastName,
    documentType: c.documentType,
    documentNumber: c.documentNumber,
    documentFrontPhoto: c.documentFrontPhoto,
    documentBackPhoto: c.documentBackPhoto,
    birthDate: c.birthDate?.toISOString() ?? null,
    address: c.address,
    gender: c.gender,
    nationality: c.nationality,
    maritalStatus: c.maritalStatus,
    allergies: c.allergies,
    regularMedication: c.regularMedication,
    relevantDiseases: c.relevantDiseases,
    previousInjuries: c.previousInjuries,
    physicalRestrictions: c.physicalRestrictions,
    bloodGroup: c.bloodGroup,
    primaryDoctor: c.primaryDoctor,
    doctorPhone: c.doctorPhone,
    doctorCertificate: c.doctorCertificate,
    profilePhoto: c.profilePhoto,
    observations: c.observations,
    _count: c._count,
  }));

  const userName =
    [user.name, user.lastName].filter(Boolean).join(' ') || 'este usuario';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <MergeChildrenClient
        children={serialized}
        userId={params.id}
        userName={userName}
      />
    </div>
  );
}
