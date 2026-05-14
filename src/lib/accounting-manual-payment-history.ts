import type { PaymentStatus } from '@prisma/client';

export function manualPaymentHistoryStatusLabel(
  status: PaymentStatus | string
) {
  switch (status) {
    case 'PENDING':
      return 'Pendiente';
    case 'APPROVED':
      return 'Aprobado';
    case 'REJECTED':
      return 'Rechazado';
    case 'CANCELLED':
      return 'Cancelado';
    default:
      return status;
  }
}

export function buildManualPaymentHistoryActionHref({
  status,
  search,
}: {
  status: PaymentStatus | string;
  search: string;
}) {
  const params = new URLSearchParams();
  params.set('status', status);
  if (search.trim()) {
    params.set('q', search.trim());
  }

  return `/accounting/manual-payments?${params.toString()}`;
}
