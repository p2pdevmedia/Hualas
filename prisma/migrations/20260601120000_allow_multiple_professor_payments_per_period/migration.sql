-- Allow a professor to have more than one approved invoice/payment in the same month.
DROP INDEX IF EXISTS "ProfessorPayment_professorProfileId_periodMonth_periodYear_key";

CREATE INDEX IF NOT EXISTS "ProfessorPayment_professorProfileId_periodYear_periodMonth_idx"
ON "ProfessorPayment"("professorProfileId", "periodYear", "periodMonth");
