CREATE TYPE "ActivityParticipantStatus" AS ENUM ('ACTIVE', 'WITHDRAWN');

ALTER TABLE "ActivityParticipant"
  ADD COLUMN "status" "ActivityParticipantStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "withdrawnAt" TIMESTAMP(3);

CREATE INDEX "ActivityParticipant_status_idx" ON "ActivityParticipant"("status");
