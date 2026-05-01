-- CreateTable
CREATE TABLE "ActivityDayType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "defaultDescription" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityDayType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityDayType_sortOrder_idx" ON "ActivityDayType"("sortOrder");

-- AlterTable
ALTER TABLE "ActivityDay" ADD COLUMN "activityDayTypeId" TEXT;

-- CreateIndex
CREATE INDEX "ActivityDay_activityDayTypeId_idx" ON "ActivityDay"("activityDayTypeId");

-- AddForeignKey
ALTER TABLE "ActivityDay" ADD CONSTRAINT "ActivityDay_activityDayTypeId_fkey"
    FOREIGN KEY ("activityDayTypeId") REFERENCES "ActivityDayType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
