CREATE TABLE "SocialFeePayment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "childId" TEXT,
  "periodMonth" INTEGER NOT NULL,
  "periodYear" INTEGER NOT NULL,
  "amount" INTEGER NOT NULL,
  "mercadoPagoPaymentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SocialFeePayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialFeePayment_userId_childId_periodMonth_periodYear_key"
ON "SocialFeePayment"("userId", "childId", "periodMonth", "periodYear");

CREATE INDEX "SocialFeePayment_periodYear_periodMonth_idx"
ON "SocialFeePayment"("periodYear", "periodMonth");

ALTER TABLE "SocialFeePayment"
ADD CONSTRAINT "SocialFeePayment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SocialFeePayment"
ADD CONSTRAINT "SocialFeePayment_childId_fkey"
FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
