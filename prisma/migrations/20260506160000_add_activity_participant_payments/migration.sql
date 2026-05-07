CREATE TYPE "ActivityParticipantPaymentType" AS ENUM ('MONTHLY', 'SESSION');

CREATE TABLE "ActivityParticipantPayment" (
  "id" TEXT NOT NULL,
  "activityParticipantId" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "childId" TEXT,
  "activityDayId" TEXT,
  "paymentType" "ActivityParticipantPaymentType" NOT NULL,
  "periodMonth" INTEGER,
  "periodYear" INTEGER,
  "amount" INTEGER NOT NULL,
  "paymentReference" TEXT NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ActivityParticipantPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivityParticipantPayment_activityParticipantId_periodMonth_periodYear_key"
ON "ActivityParticipantPayment"("activityParticipantId", "periodMonth", "periodYear");

CREATE UNIQUE INDEX "ActivityParticipantPayment_activityParticipantId_activityDayId_key"
ON "ActivityParticipantPayment"("activityParticipantId", "activityDayId");

CREATE INDEX "ActivityParticipantPayment_activityId_periodYear_periodMonth_idx"
ON "ActivityParticipantPayment"("activityId", "periodYear", "periodMonth");

CREATE INDEX "ActivityParticipantPayment_activityDayId_idx"
ON "ActivityParticipantPayment"("activityDayId");

CREATE INDEX "ActivityParticipantPayment_userId_idx"
ON "ActivityParticipantPayment"("userId");

CREATE INDEX "ActivityParticipantPayment_childId_idx"
ON "ActivityParticipantPayment"("childId");

ALTER TABLE "ActivityParticipantPayment"
ADD CONSTRAINT "ActivityParticipantPayment_activityParticipantId_fkey"
FOREIGN KEY ("activityParticipantId") REFERENCES "ActivityParticipant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityParticipantPayment"
ADD CONSTRAINT "ActivityParticipantPayment_activityId_fkey"
FOREIGN KEY ("activityId") REFERENCES "Activity"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityParticipantPayment"
ADD CONSTRAINT "ActivityParticipantPayment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityParticipantPayment"
ADD CONSTRAINT "ActivityParticipantPayment_childId_fkey"
FOREIGN KEY ("childId") REFERENCES "Child"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityParticipantPayment"
ADD CONSTRAINT "ActivityParticipantPayment_activityDayId_fkey"
FOREIGN KEY ("activityDayId") REFERENCES "ActivityDay"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

WITH single_activity_day AS (
  SELECT
    "activityId",
    MIN("id") AS "activityDayId",
    COUNT(*) AS "dayCount"
  FROM "ActivityDay"
  WHERE "cancelled" = false
  GROUP BY "activityId"
)
INSERT INTO "ActivityParticipantPayment" (
  "id",
  "activityParticipantId",
  "activityId",
  "userId",
  "childId",
  "activityDayId",
  "paymentType",
  "periodMonth",
  "periodYear",
  "amount",
  "paymentReference",
  "paidAt",
  "createdAt",
  "updatedAt"
)
SELECT
  CONCAT('legacy-activity-payment-', ap."id"),
  ap."id",
  ap."activityId",
  ap."userId",
  ap."childId",
  CASE
    WHEN a."activityType" = 'TEMPORARY' AND sad."dayCount" = 1
      THEN sad."activityDayId"
    ELSE NULL
  END,
  CASE
    WHEN a."activityType" = 'ANNUAL'
      THEN 'MONTHLY'::"ActivityParticipantPaymentType"
    ELSE 'SESSION'::"ActivityParticipantPaymentType"
  END,
  CASE
    WHEN a."activityType" = 'ANNUAL'
      THEN EXTRACT(MONTH FROM COALESCE(ap."receiptDate", CURRENT_TIMESTAMP))::int
    ELSE NULL
  END,
  CASE
    WHEN a."activityType" = 'ANNUAL'
      THEN EXTRACT(YEAR FROM COALESCE(ap."receiptDate", CURRENT_TIMESTAMP))::int
    ELSE NULL
  END,
  a."price",
  COALESCE(ap."receipt", CONCAT('legacy:', ap."id")),
  COALESCE(ap."receiptDate", CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "ActivityParticipant" ap
JOIN "Activity" a ON a."id" = ap."activityId"
LEFT JOIN single_activity_day sad ON sad."activityId" = ap."activityId"
WHERE
  ap."receipt" IS NOT NULL
  AND (
    a."activityType" = 'ANNUAL'
    OR (a."activityType" = 'TEMPORARY' AND sad."dayCount" = 1)
  )
ON CONFLICT DO NOTHING;
