import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { buildProfessorInvoiceFileUrl } from '@/lib/blob-urls';
import type { ProfessorInvoice } from '@prisma/client';
import ProfessorInvoicesPanel from '@/components/accounting/professor-invoices-panel';
import MyPaymentsClient from './my-payments-client';

export default async function MyPaymentsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const role =
    (session?.user as any)?.activeRole ?? (session?.user as any)?.role;

  if (!userId || role !== 'PROFESSOR') redirect('/');

  const profile = await prisma.professorProfile.findUnique({
    where: { userId },
    include: {
      payments: {
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      },
    },
  });

  let invoices: ProfessorInvoice[] = [];
  try {
    invoices = await prisma.professorInvoice.findMany({
      where: { professorId: userId },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.error('[my-payments] failed to load professor invoices', err);
  }

  const initialProfile = profile
    ? {
        monthlySalary: profile.monthlySalary,
        bankName: profile.bankName,
        cbu: profile.cbu,
        alias: profile.alias,
        cuit: profile.cuit,
        notes: profile.notes,
        payments: profile.payments.map((payment) => ({
          id: payment.id,
          periodMonth: payment.periodMonth,
          periodYear: payment.periodYear,
          amount: payment.amount,
          status: payment.status,
          paidAt: payment.paidAt?.toISOString() ?? null,
          notes: payment.notes,
        })),
      }
    : null;

  const invoiceRows = invoices.map((invoice) => ({
    id: invoice.id,
    originalName: invoice.originalName,
    contentType: invoice.contentType,
    size: invoice.size,
    createdAt: invoice.createdAt.toISOString(),
    fileUrl: buildProfessorInvoiceFileUrl(invoice.id),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <header className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
          Mi cuenta
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Mis pagos</h1>
        <p className="text-sm text-muted-foreground">
          Información de sueldo, datos bancarios y pagos registrados por
          contaduría.
        </p>
      </header>

      <MyPaymentsClient professorId={userId} initialProfile={initialProfile} />

      <ProfessorInvoicesPanel
        professorId={userId}
        initialInvoices={invoiceRows}
        canUpload={true}
        canDelete={true}
        title="Mis facturas"
        description="Subí tus facturas en PDF o imagen para que contaduría las revise desde tu perfil de profesor."
        emptyMessage="Todavía no subiste facturas."
      />
    </div>
  );
}
