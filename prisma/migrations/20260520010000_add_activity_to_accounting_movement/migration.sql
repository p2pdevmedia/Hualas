ALTER TABLE "AccountingMovement"
ADD COLUMN IF NOT EXISTS "activityId" TEXT;

CREATE INDEX IF NOT EXISTS "AccountingMovement_activityId_idx"
ON "AccountingMovement"("activityId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AccountingMovement_activityId_fkey'
  ) THEN
    ALTER TABLE "AccountingMovement"
    ADD CONSTRAINT "AccountingMovement_activityId_fkey"
    FOREIGN KEY ("activityId")
    REFERENCES "Activity"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
