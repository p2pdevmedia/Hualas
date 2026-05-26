CREATE UNIQUE INDEX IF NOT EXISTS "SocialFeePayment_adult_period_key"
ON "SocialFeePayment"("userId", "periodMonth", "periodYear")
WHERE "childId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_provider_providerPaymentId_key"
ON "Payment"("provider", "providerPaymentId")
WHERE "providerPaymentId" IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ActivityParticipantPayment_monthly_period_required_chk'
  ) THEN
    ALTER TABLE "ActivityParticipantPayment"
      ADD CONSTRAINT "ActivityParticipantPayment_monthly_period_required_chk"
      CHECK (
        "paymentType" <> 'MONTHLY'
        OR ("periodMonth" IS NOT NULL AND "periodYear" IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ActivityParticipantPayment_session_day_required_chk'
  ) THEN
    ALTER TABLE "ActivityParticipantPayment"
      ADD CONSTRAINT "ActivityParticipantPayment_session_day_required_chk"
      CHECK (
        "paymentType" <> 'SESSION'
        OR "activityDayId" IS NOT NULL
      );
  END IF;
END $$;
