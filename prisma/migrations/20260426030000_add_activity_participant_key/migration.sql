-- Add a stable unique key that works for both parent and child enrollments.
ALTER TABLE "ActivityParticipant"
ADD COLUMN "participantKey" TEXT;

UPDATE "ActivityParticipant"
SET "participantKey" = CONCAT(
  "activityId",
  ':',
  "userId",
  ':',
  COALESCE("childId", 'self')
);

-- Keep one row per logical enrollment before adding the unique index.
WITH ranked AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY CONCAT(
        "activityId",
        ':',
        "userId",
        ':',
        COALESCE("childId", 'self')
      )
      ORDER BY COALESCE("receiptDate", to_timestamp(0)) DESC, "id" DESC
    ) AS rn
  FROM "ActivityParticipant"
)
DELETE FROM "ActivityParticipant"
WHERE ctid IN (
  SELECT ctid
  FROM ranked
  WHERE rn > 1
);

ALTER TABLE "ActivityParticipant"
ALTER COLUMN "participantKey" SET NOT NULL;

CREATE UNIQUE INDEX "ActivityParticipant_participantKey_key"
ON "ActivityParticipant"("participantKey");

DROP INDEX IF EXISTS "ActivityParticipant_activityId_userId_childId_key";
