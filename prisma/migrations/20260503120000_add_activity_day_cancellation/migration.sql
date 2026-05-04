-- AlterTable
ALTER TABLE "ActivityDay" ADD COLUMN "cancelled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ActivityDay" ADD COLUMN "cancellationReason" TEXT;
