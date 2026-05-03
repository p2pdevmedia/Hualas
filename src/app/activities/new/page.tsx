import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { gateAdmin } from '@/lib/role-guards';
import CreateActivityPageClient from './page-client';

type ProfessorOption = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
};

export default async function CreateActivityPage() {
  const session = await getServerSession(authOptions);
  const block = gateAdmin(session);
  if (block) return block;

  const professors = await prisma.user.findMany({
    where: {
      roleAssignments: { some: { role: 'PROFESSOR' } },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
    },
    orderBy: [{ name: 'asc' }, { lastName: 'asc' }],
  });

  return <CreateActivityPageClient professors={professors} />;
}
