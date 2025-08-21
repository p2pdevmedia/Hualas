-- CreateEnum
CREATE TYPE "ActivityFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'ONE_TIME');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "frequency" "ActivityFrequency" NOT NULL DEFAULT 'ONE_TIME';
