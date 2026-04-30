import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isAccountingRole } from '@/lib/accounting';
import { listManualPayments } from '@/lib/services/manual-payment-service';
import ManualPaymentsDashboard from '@/components/accounting/manual-payments-dashboard';

type SearchParams = {
  status?: string;
  page?: string;
  limit?: string;
};

export default async function ManualPaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole(session?.user?.role)) {
    redirect('/');
  }

  const page = Math.max(Number(searchParams.page ?? '1') || 1, 1);
  const limit = Math.min(
    Math.max(Number(searchParams.limit ?? '20') || 20, 1),
    50
  );
  const offset = (page - 1) * limit;
  const status =
    searchParams.status === 'PENDING' ||
    searchParams.status === 'APPROVED' ||
    searchParams.status === 'REJECTED'
      ? searchParams.status
      : null;

  const result = await listManualPayments({
    status,
    limit,
    offset,
  });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Pagos manuales</h1>
        <p className="text-sm text-muted-foreground">
          Revisión de transferencias bancarias con comprobante adjunto.
        </p>
      </header>

      <form className="flex flex-wrap gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Estado</span>
          <select
            name="status"
            defaultValue={status ?? ''}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="PENDING">Pendientes</option>
            <option value="APPROVED">Aprobados</option>
            <option value="REJECTED">Rechazados</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Cantidad por página</span>
          <select
            name="limit"
            defaultValue={String(limit)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </label>
        <input type="hidden" name="page" value="1" />
        <div className="flex items-end">
          <button
            type="submit"
            className="h-10 rounded-md border border-input bg-foreground px-4 text-sm font-medium text-background"
          >
            Filtrar
          </button>
        </div>
      </form>

      <ManualPaymentsDashboard
        payments={result.items}
        total={result.total}
        page={page}
        pageSize={limit}
        status={status}
      />
    </div>
  );
}
