import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { isAccountingRole, formatPersonName } from '@/lib/accounting';
import ProfessorProfileForm from './professor-profile-form';

export default async function ProfessorAccountingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole((session?.user as any)?.role)) redirect('/');

  const professor = await prisma.user.findUnique({
    where: { id: params.id, role: 'PROFESSOR' },
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      phone: true,
      professorProfile: {
        include: {
          payments: {
            orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
            include: {
              createdBy: { select: { id: true, name: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  if (!professor) notFound();

  const profile = professor.professorProfile
    ? {
        monthlySalary: professor.professorProfile.monthlySalary,
        bankName: professor.professorProfile.bankName,
        cbu: professor.professorProfile.cbu,
        alias: professor.professorProfile.alias,
        cuit: professor.professorProfile.cuit,
        notes: professor.professorProfile.notes,
      }
    : null;

  const payments = (professor.professorProfile?.payments ?? []).map((p) => ({
    id: p.id,
    periodMonth: p.periodMonth,
    periodYear: p.periodYear,
    amount: p.amount,
    status: p.status as 'PENDING' | 'PAID' | 'CANCELLED',
    paidAt: p.paidAt?.toISOString() ?? null,
    notes: p.notes,
    createdBy: p.createdBy,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/accounting/professors"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Profesores
          </Link>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            {formatPersonName(professor)}
          </h2>
          <p className="text-sm text-muted-foreground">{professor.email}</p>
        </div>
      </div>

      <ProfessorProfileForm
        professorId={professor.id}
        profile={profile}
        payments={payments}
      />
    </div>
  );
}
