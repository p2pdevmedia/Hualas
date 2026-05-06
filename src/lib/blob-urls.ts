export function buildAccountingMovementReceiptUrl(id: string) {
  return `/api/accounting/movements/${id}/receipt`;
}

export function buildManualPaymentReceiptUrl(id: string) {
  return `/api/accounting/manual-payments/${id}/receipt`;
}

export function buildProfessorInvoiceFileUrl(id: string) {
  return `/api/professor-invoices/${id}/file`;
}
