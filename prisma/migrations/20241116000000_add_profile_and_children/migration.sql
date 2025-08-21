-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('FEMALE','MALE','NON_BINARY','UNDISCLOSED','OTHER');

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "lastName" TEXT,
  ADD COLUMN "dni" TEXT,
  ADD COLUMN "birthDate" TIMESTAMP(3),
  ADD COLUMN "gender" "Gender",
  ADD COLUMN "address" TEXT,
  ADD COLUMN "nationality" TEXT,
  ADD COLUMN "maritalStatus" TEXT;

CREATE UNIQUE INDEX "User_dni_key" ON "User"("dni");

-- CreateTable
CREATE TABLE "Child" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "birthDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ActivityParticipant"
  ADD COLUMN "childId" TEXT;

-- AddForeignKey
ALTER TABLE "ActivityParticipant" ADD CONSTRAINT "ActivityParticipant_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropIndex
DROP INDEX "ActivityParticipant_activityId_userId_key";

-- CreateIndex
CREATE UNIQUE INDEX "ActivityParticipant_activityId_userId_childId_key" ON "ActivityParticipant"("activityId", "userId", "childId");
