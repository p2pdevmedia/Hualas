import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { formatPersonName } from '@/lib/accounting';
import { buildProfessorInvoiceFileUrl } from '@/lib/blob-urls';
import ProfessorInvoicesPanel from '@/components/accounting/professor-invoices-panel';
import ProfessorProfileForm from './professor-profile-form';

function isPendingProfessorInvoiceMigrationError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ['P2021', 'P2022'].includes(error.code)
  ) {
    const message = error.message;
    return (
      message.includes('ProfessorInvoice') ||
      message.includes('ProfessorPayment') ||
      message.includes('invoiceId') ||
      message.includes('approvedAt') ||
      message.includes('transferredAt')
    );
  }

  return false;
}

export default async function ProfessorAccountingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Auth gating happens in the parent /accounting layout.
  await getServerSession(authOptions);

  const professor = await prisma.user.findFirst({
    where: {
      id: params.id,
      roleAssignments: { some: { role: 'PROFESSOR' } },
    },
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      phone: true,
      professorProfile: {
        select: {
          monthlySalary: true,
          bankName: true,
          cbu: true,
          alias: true,
          cuit: true,
          notes: true,
          payments: {
            orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
            select: {
              id: true,
              periodMonth: true,
              periodYear: true,
              amount: true,
              status: true,
              paidAt: true,
              notes: true,
              createdBy: { select: { id: true, name: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  if (!professor) notFound();

  let invoiceLoadWarning = false;
  const professorInvoices = await prisma.professorInvoice
    .findMany({
      where: { professorId: professor.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        originalName: true,
        contentType: true,
        size: true,
        status: true,
        approvedAt: true,
        transferredAt: true,
        createdAt: true,
      },
    })
    .catch((error) => {
      if (isPendingProfessorInvoiceMigrationError(error)) {
        invoiceLoadWarning = true;
        console.error(
          'Professor invoice data is unavailable. Run the pending Prisma migrations.',
          error
        );
        return [];
      }

      throw error;
    });

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
    invoice: null,
  }));

  const invoices = professorInvoices.map((invoice) => ({
    id: invoice.id,
    originalName: invoice.originalName,
    contentType: invoice.contentType,
    size: invoice.size,
    status: invoice.status,
    approvedAt: invoice.approvedAt?.toISOString() ?? null,
    transferredAt: invoice.transferredAt?.toISOString() ?? null,
    createdAt: invoice.createdAt.toISOString(),
    fileUrl: buildProfessorInvoiceFileUrl(invoice.id),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/accounting/professors"
            prefetch={true}
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
        invoices={invoices}
        invoiceApprovalDisabled={invoiceLoadWarning}
      />

      {invoiceLoadWarning && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Las facturas todavia no estan disponibles en esta base de datos.
          Aplica las migraciones pendientes para habilitar la aprobacion y
          consulta de facturas de profesores.
        </div>
      )}

      <ProfessorInvoicesPanel
        professorId={professor.id}
        initialInvoices={invoices}
        canDelete={!invoiceLoadWarning}
        title="Facturas"
        description="Facturas cargadas por el profesor desde Mis pagos."
        emptyMessage="El profesor todavía no cargó facturas."
      />
    </div>
  );
}
