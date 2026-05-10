-- CreateTable
CREATE TABLE "AccountingMonthClose" (
    "id" TEXT NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalIncome" INTEGER NOT NULL,
    "totalExpense" INTEGER NOT NULL,
    "netBalance" INTEGER NOT NULL,
    "positiveBalance" INTEGER NOT NULL,
    "activitySnapshot" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingMonthClose_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountingMonthClose_periodYear_periodMonth_key" ON "AccountingMonthClose"("periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "AccountingMonthClose_periodStart_periodEnd_idx" ON "AccountingMonthClose"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "AccountingMonthClose_createdById_idx" ON "AccountingMonthClose"("createdById");

-- AddForeignKey
ALTER TABLE "AccountingMonthClose" ADD CONSTRAINT "AccountingMonthClose_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
