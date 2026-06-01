-- Associate professor invoices/payments with activities going forward.
ALTER TABLE "ProfessorInvoice" ADD COLUMN "activityId" TEXT;
ALTER TABLE "ProfessorPayment" ADD COLUMN "activityId" TEXT;

-- Legacy invoices did not capture activity, so they cannot be reconciled into an activity cashbox.
DELETE FROM "ProfessorInvoice"
WHERE "activityId" IS NULL;

CREATE INDEX "ProfessorInvoice_activityId_status_idx" ON "ProfessorInvoice"("activityId", "status");
CREATE INDEX "ProfessorPayment_activityId_status_idx" ON "ProfessorPayment"("activityId", "status");

ALTER TABLE "ProfessorInvoice"
ADD CONSTRAINT "ProfessorInvoice_activityId_fkey"
FOREIGN KEY ("activityId") REFERENCES "Activity"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProfessorPayment"
ADD CONSTRAINT "ProfessorPayment_activityId_fkey"
FOREIGN KEY ("activityId") REFERENCES "Activity"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
