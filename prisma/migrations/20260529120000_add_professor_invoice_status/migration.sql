CREATE TYPE "ProfessorInvoiceStatus" AS ENUM ('PENDING', 'APPROVED', 'TRANSFERRED');

ALTER TABLE "ProfessorInvoice"
ADD COLUMN "status" "ProfessorInvoiceStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "transferredAt" TIMESTAMP(3);

ALTER TABLE "ProfessorPayment"
ADD COLUMN "invoiceId" TEXT;

CREATE UNIQUE INDEX "ProfessorPayment_invoiceId_key" ON "ProfessorPayment"("invoiceId");
CREATE INDEX "ProfessorInvoice_status_createdAt_idx" ON "ProfessorInvoice"("status", "createdAt");

ALTER TABLE "ProfessorPayment"
ADD CONSTRAINT "ProfessorPayment_invoiceId_fkey"
FOREIGN KEY ("invoiceId") REFERENCES "ProfessorInvoice"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
