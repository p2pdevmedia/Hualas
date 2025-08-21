-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('MONTHLY', 'ONE_TIME');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "paymentType" "PaymentType" NOT NULL DEFAULT 'ONE_TIME';
