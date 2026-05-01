CREATE TYPE "ActivityType" AS ENUM ('TEMPORARY', 'ANNUAL');

ALTER TABLE "Activity"
ADD COLUMN "activityType" "ActivityType" NOT NULL DEFAULT 'TEMPORARY',
ADD COLUMN "endDate" TIMESTAMP(3);

UPDATE "Activity"
SET "endDate" = "date"
WHERE "endDate" IS NULL;

ALTER TABLE "Activity"
ALTER COLUMN "endDate" SET NOT NULL;
