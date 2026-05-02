-- CreateEnum
CREATE TYPE "ProfessorPaymentStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "ProfessorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthlySalary" INTEGER NOT NULL DEFAULT 0,
    "bankName" TEXT,
    "cbu" TEXT,
    "alias" TEXT,
    "cuit" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessorPayment" (
    "id" TEXT NOT NULL,
    "professorProfileId" TEXT NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "ProfessorPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessorPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessorProfile_userId_key" ON "ProfessorProfile"("userId");

-- CreateIndex
CREATE INDEX "ProfessorProfile_userId_idx" ON "ProfessorProfile"("userId");

-- CreateIndex
CREATE INDEX "ProfessorPayment_professorProfileId_idx" ON "ProfessorPayment"("professorProfileId");

-- CreateIndex
CREATE INDEX "ProfessorPayment_status_periodMonth_periodYear_idx" ON "ProfessorPayment"("status", "periodMonth", "periodYear");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessorPayment_professorProfileId_periodMonth_periodYear_key" ON "ProfessorPayment"("professorProfileId", "periodMonth", "periodYear");

-- AddForeignKey
ALTER TABLE "ProfessorProfile" ADD CONSTRAINT "ProfessorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessorPayment" ADD CONSTRAINT "ProfessorPayment_professorProfileId_fkey" FOREIGN KEY ("professorProfileId") REFERENCES "ProfessorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessorPayment" ADD CONSTRAINT "ProfessorPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
